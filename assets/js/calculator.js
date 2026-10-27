/**
 * BLDC Motor Lab - Engineering Calculator & Dynamics Engine
 * Includes Real-World Load Equilibrium Solver (Drone Propeller, EV Wheel, Winch)
 */

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function num(id) { 
    const el = $(id);
    if (!el) return NaN;
    const v = parseFloat(el.value);
    return isFinite(v) ? v : NaN;
  }

  function fmt(n, decimals = 1) {
    if (!isFinite(n)) return '—';
    const a = Math.abs(n);
    if (a === 0) return '0';
    if (a >= 1000) return Math.round(n).toLocaleString('en-US');
    if (a >= 100) return n.toFixed(0);
    if (a >= 10) return n.toFixed(1);
    if (a >= 1) return n.toFixed(decimals);
    return n.toPrecision(3);
  }

  const chart = $('chart-svg');
  const alertBox = $('calc-alert');

  // Load Bench State
  let currentLoadMode = 'prop'; // 'prop', 'ev', 'winch'

  function drawInteractiveChart(noLoadRpm, stallTorque, curTorque, curRpm, stallCurrent, eqTorque, eqRpm) {
    if (!chart) return;

    const L = 60, R = 25, T = 25, B = 45;
    const W = 520, H = 240;
    const plotW = W - L - R;
    const plotH = H - T - B;

    function xMap(torqueVal) {
      return L + plotW * Math.min(1, Math.max(0, torqueVal / stallTorque));
    }

    function yMap(rpmVal) {
      return T + plotH * (1 - Math.min(1, Math.max(0, rpmVal / noLoadRpm)));
    }

    let svgHtml = '';

    // Calibration Grid lines & Axis labels
    [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
      const y = yMap(noLoadRpm * frac);
      const x = xMap(stallTorque * frac);

      // Horizontal grid line
      svgHtml += `<line x1="${L}" x2="${L + plotW}" y1="${y}" y2="${y}" stroke="#1B222E" stroke-width="1"/>`;
      svgHtml += `<text x="${L - 8}" y="${y + 4}" fill="#536074" font-size="9" font-family="var(--font-mono)" text-anchor="end">${fmt(noLoadRpm * frac, 0)}</text>`;

      // Vertical grid line
      svgHtml += `<line x1="${x}" x2="${x}" y1="${T}" y2="${T + plotH}" stroke="#1B222E" stroke-width="1"/>`;
      svgHtml += `<text x="${x}" y="${T + plotH + 16}" fill="#536074" font-size="9" font-family="var(--font-mono)" text-anchor="middle">${fmt(stallTorque * frac, 2)}</text>`;
    });

    // Axis titles
    svgHtml += `<text x="${L}" y="14" fill="#8E9BAE" font-size="10" font-weight="700" font-family="var(--font-mono)">RPM [VELOCITY]</text>`;
    svgHtml += `<text x="${L + plotW / 2}" y="${H - 8}" fill="#8E9BAE" font-size="10" font-weight="700" font-family="var(--font-mono)" text-anchor="middle">SHAFT TORQUE (N·m)</text>`;

    // Linear Motor Torque-Speed Line (High-Voltage Phosphor Amber)
    const x0 = xMap(0), y0 = yMap(noLoadRpm);
    const xEnd = xMap(stallTorque), yEnd = yMap(0);
    svgHtml += `<line x1="${x0}" y1="${y0}" x2="${xEnd}" y2="${yEnd}" stroke="#FF8800" stroke-width="2.5"/>`;

    // Draw Load Equilibrium Curve if available
    if (isFinite(eqTorque) && isFinite(eqRpm) && eqRpm > 0 && eqTorque > 0) {
      let loadD = '';
      const SAMPLES = 24;
      for (let s = 0; s <= SAMPLES; s++) {
        const rVal = (s / SAMPLES) * noLoadRpm;
        let tVal = 0;
        if (currentLoadMode === 'prop') {
          tVal = eqTorque * Math.pow(rVal / eqRpm, 2);
        } else if (currentLoadMode === 'ev') {
          tVal = eqTorque * (0.6 + 0.4 * Math.pow(rVal / eqRpm, 2));
        } else {
          tVal = eqTorque; // constant load line
        }
        const lx = xMap(tVal);
        const ly = yMap(rVal);
        loadD += (s === 0 ? 'M ' : ' L ') + lx + ' ' + ly;
      }
      svgHtml += `<path d="${loadD}" fill="none" stroke="#00D2A0" stroke-width="2" stroke-dasharray="4 2"/>`;

      // Equilibrium Point Marker (Green Diamond)
      const eqX = xMap(eqTorque);
      const eqY = yMap(eqRpm);
      svgHtml += `
        <circle cx="${eqX}" cy="${eqY}" r="6" fill="#00D2A0" stroke="#FFFFFF" stroke-width="1.5"/>
        <text x="${eqX + 10}" y="${eqY - 8}" fill="#00D2A0" font-size="9" font-family="var(--font-mono)" font-weight="700">
          LOAD EQUILIBRIUM: ${fmt(eqRpm, 0)} RPM
        </text>
      `;
    }

    // Current User Set Operating Point
    const ptX = xMap(curTorque);
    const ptY = yMap(curRpm);

    // Instrument Crosshair Lines
    svgHtml += `<line x1="${ptX}" x2="${ptX}" y1="${ptY}" y2="${T + plotH}" stroke="#FF8800" stroke-width="1" stroke-dasharray="2 2"/>`;
    svgHtml += `<line x1="${L}" x2="${ptX}" y1="${ptY}" y2="${ptY}" stroke="#FF8800" stroke-width="1" stroke-dasharray="2 2"/>`;

    // Operating Point Register Marker
    svgHtml += `<circle cx="${ptX}" cy="${ptY}" r="4" fill="#FF8800" stroke="#FFFFFF" stroke-width="1"/>`;

    chart.innerHTML = svgHtml;
  }

  function solveLoadEquilibrium(V, Kv, R, Kt, noLoadRpm, stallTorque) {
    if (!V || !Kv || !R || !Kt || noLoadRpm <= 0) return { eqRpm: 0, eqTorque: 0 };

    let eqRpm = 0;
    let eqTorque = 0;
    let metricText = '';
    let recommendation = '';

    if (currentLoadMode === 'prop') {
      const dia = parseFloat($('slider-prop-dia').value) || 9;
      const pitch = parseFloat($('slider-prop-pitch').value) || 4.5;
      if ($('val-prop-dia')) $('val-prop-dia').textContent = `${dia.toFixed(1)} INCHES`;
      if ($('val-prop-pitch')) $('val-prop-pitch').textContent = `${pitch.toFixed(1)} INCHES`;

      // Prop aerodynamic constant: k_prop
      const kProp = 1.15e-8 * Math.pow(dia, 4) * (pitch / 4.5);
      
      // Motor: Torque = Kt * (V - N/Kv) / R
      // Load: Torque = kProp * N^2
      // Solve: (kProp) * N^2 + (Kt / (R * Kv)) * N - (Kt * V / R) = 0
      const a = kProp;
      const b = Kt / (R * Kv);
      const c = -stallTorque;

      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        eqRpm = (-b + Math.sqrt(disc)) / (2 * a);
      }
      eqRpm = Math.min(noLoadRpm, Math.max(0, eqRpm));
      eqTorque = kProp * eqRpm * eqRpm;

      const staticThrustGrams = 0.082 * Math.pow(dia, 3) * pitch * Math.pow(eqRpm / 1000, 2);
      metricText = `${fmt(staticThrustGrams, 0)} g Static Thrust`;
      
      const pctFree = (eqRpm / noLoadRpm) * 100;
      recommendation = `Aerodynamic propeller drag balances motor torque at ${fmt(pctFree, 1)}% free-speed. Generates ${fmt(staticThrustGrams, 0)}g thrust. Continuous airflow will cool stator coils.`;

    } else if (currentLoadMode === 'ev') {
      const mass = parseFloat($('slider-ev-mass').value) || 75;
      const slope = parseFloat($('slider-ev-slope').value) || 4;
      if ($('val-ev-mass')) $('val-ev-mass').textContent = `${mass} KG`;
      if ($('val-ev-slope')) $('val-ev-slope').textContent = `${slope}% GRADE`;

      // Rolling friction + gravity on incline
      const wheelRadiusM = 0.127; // 10 inch wheel
      const g = 9.81;
      const totalForceN = mass * g * (0.018 + slope / 100);
      eqTorque = totalForceN * wheelRadiusM * 0.15; // with gear reduction

      // Motor RPM at this torque: N = Kv * (V - (eqTorque / Kt) * R)
      if (eqTorque < stallTorque) {
        const Ireq = eqTorque / Kt;
        eqRpm = Math.max(0, Kv * (V - Ireq * R));
      } else {
        eqRpm = 0; // Stalled
      }

      const speedKmh = (2 * Math.PI * wheelRadiusM * (eqRpm * 0.15) / 60) * 3.6;
      metricText = `${fmt(speedKmh, 1)} km/h Ground Velocity`;
      recommendation = eqRpm > 0 
        ? `Wheel tractive resistance requires ${fmt(eqTorque, 2)} N·m. Operating at ${fmt(speedKmh, 1)} km/h up ${slope}% incline. ${eqTorque / stallTorque > 0.6 ? 'Warning: High torque gradient.' : 'Nominal climb.'}`
        : 'Motor Stalled: Torque demand exceeds stall capacity. Downshift or reduce vehicle mass.';

    } else { // winch
      const payload = parseFloat($('slider-winch-mass').value) || 2.5;
      const radiusMm = parseFloat($('slider-winch-radius').value) || 25;
      if ($('val-winch-mass')) $('val-winch-mass').textContent = `${payload.toFixed(1)} KG`;
      if ($('val-winch-radius')) $('val-winch-radius').textContent = `${radiusMm} MM`;

      const g = 9.81;
      eqTorque = payload * g * (radiusMm / 1000);

      if (eqTorque < stallTorque) {
        const Ireq = eqTorque / Kt;
        eqRpm = Math.max(0, Kv * (V - Ireq * R));
      } else {
        eqRpm = 0;
      }

      const liftSpeedMps = (2 * Math.PI * (radiusMm / 1000) * eqRpm) / 60;
      metricText = `${fmt(liftSpeedMps, 2)} m/s Vertical Lift`;
      recommendation = eqRpm > 0 
        ? `Lifting ${payload} kg at ${fmt(liftSpeedMps, 2)} m/s. Holding torque = ${fmt(eqTorque, 3)} N·m. Motor draws ${fmt(eqTorque / Kt, 1)} A.`
        : 'Winch Stalled: Payload exceeds motor stall torque.';
    }

    // Update Load Output DOM
    if ($('eq-rpm')) $('eq-rpm').textContent = `${fmt(eqRpm, 0)} RPM`;
    if ($('eq-torque')) $('eq-torque').textContent = `${fmt(eqTorque, 3)} N·m`;
    const eqCurrent = eqTorque / Kt;
    if ($('eq-current')) $('eq-current').textContent = `${fmt(eqCurrent, 1)} A`;
    if ($('eq-app-metric')) $('eq-app-metric').textContent = metricText;
    if ($('eq-recommendation')) $('eq-recommendation').textContent = recommendation;

    const badge = $('eq-status-badge');
    if (badge) {
      if (eqRpm === 0) {
        badge.className = 'badge badge-warning';
        badge.textContent = 'STALLED LOAD';
      } else if (eqRpm / noLoadRpm < 0.4) {
        badge.className = 'badge badge-info';
        badge.textContent = 'HIGH COPPER LOSS';
      } else {
        badge.className = 'badge badge-success';
        badge.textContent = 'STABLE EQUILIBRIUM';
      }
    }

    return { eqRpm, eqTorque };
  }

  function calculate() {
    const V = num('in-v');
    const Kv = num('in-kv');
    const R = num('in-r');
    const I = num('in-i');

    const outIds = ['o-noload', 'o-speed', 'o-torque', 'o-torquekg', 'o-pmech', 'o-pin', 'o-eff', 'o-heat', 'o-kt', 'o-istall'];
    
    if (!(V > 0 && Kv > 0 && R > 0 && I >= 0)) {
      outIds.forEach(id => {
        const el = $(id);
        if (el) el.textContent = '—';
      });
      if (chart) chart.innerHTML = '';
      if (alertBox) alertBox.innerHTML = '<span class="badge badge-warning">[INPUT_REQUIRED]</span> Enter positive parameters.';
      return;
    }

    // Engineering Formulas
    const Kt = 9.549297 / Kv;            // Torque constant (N·m/A)
    const Imax = V / R;                  // Theoretical stall current (A)
    const isStalled = I >= Imax;
    const Ie = Math.min(I, Imax);        // Clamped effective current
    const bemf = Math.max(0, V - Ie * R); // Back-EMF (V)
    
    const noLoadRpm = Kv * V;
    const loadedRpm = Kv * bemf;
    const torqueNm = Kt * Ie;
    const torqueKgCm = torqueNm * 10.1972;
    const stallTorque = Kt * Imax;

    const pMech = bemf * Ie;             // Mechanical power output (W)
    const pIn = V * Ie;                  // Electrical power input (W)
    const eff = pIn > 0 ? (pMech / pIn) * 100 : 0;
    const pHeat = Ie * Ie * R;           // Winding I²R copper loss (W)

    // Update Output Elements
    if ($('o-noload')) $('o-noload').textContent = `${fmt(noLoadRpm, 0)} RPM`;
    if ($('o-speed')) $('o-speed').textContent = `${fmt(loadedRpm, 0)} RPM`;
    if ($('o-torque')) $('o-torque').textContent = `${fmt(torqueNm, 3)} N·m`;
    if ($('o-torquekg')) $('o-torquekg').textContent = `${fmt(torqueKgCm, 2)} kg·cm`;
    if ($('o-pmech')) $('o-pmech').textContent = `${fmt(pMech, 1)} W`;
    if ($('o-pin')) $('o-pin').textContent = `${fmt(pIn, 1)} W`;
    if ($('o-eff')) $('o-eff').textContent = `${fmt(eff, 1)}%`;
    if ($('o-heat')) $('o-heat').textContent = `${fmt(pHeat, 1)} W`;
    if ($('o-kt')) $('o-kt').textContent = `${fmt(Kt, 4)} N·m/A`;
    if ($('o-istall')) $('o-istall').textContent = `${fmt(Imax, 1)} A`;

    // Efficiency Color Output
    const effEl = $('o-eff');
    if (effEl) {
      if (eff >= 80) effEl.style.color = '#00D2A0';
      else if (eff >= 60) effEl.style.color = '#FF8800';
      else effEl.style.color = '#EF4444';
    }

    // Technical Alert Indicator
    if (alertBox) {
      if (isStalled) {
        alertBox.innerHTML = `
          <div style="color: #EF4444; font-family: var(--font-mono); font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
            <b style="background: #EF4444; color: #000; padding: 2px 8px; border-radius: var(--radius-pill);">CRITICAL</b>
            <span>MOTOR STALLED: Current has reached limit (${fmt(Imax, 1)} A). Output is 0 RPM.</span>
          </div>
        `;
      } else if (pHeat > 150) {
        alertBox.innerHTML = `
          <div style="color: #FF8800; font-family: var(--font-mono); font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
            <b style="background: #FF8800; color: #000; padding: 2px 8px; border-radius: var(--radius-pill);">CAUTION</b>
            <span>THERMAL DISSIPATION: Generating ${fmt(pHeat, 0)}W of I²R winding heat.</span>
          </div>
        `;
      } else {
        alertBox.innerHTML = `
          <div style="color: #00D2A0; font-family: var(--font-mono); font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
            <b style="background: #00D2A0; color: #000; padding: 2px 8px; border-radius: var(--radius-pill);">NOMINAL</b>
            <span>EQUILIBRIUM VERIFIED: Operating within acceptable electromagnetic tolerances.</span>
          </div>
        `;
      }
    }

    // Solve Load Equilibrium
    const { eqRpm, eqTorque } = solveLoadEquilibrium(V, Kv, R, Kt, noLoadRpm, stallTorque);

    // Render Chart
    drawInteractiveChart(noLoadRpm, stallTorque, torqueNm, loadedRpm, Imax, eqTorque, eqRpm);
  }

  // Setup Presets
  const presets = document.querySelectorAll('.calc-preset-bar .preset-chip');
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');

      $('in-v').value = btn.getAttribute('data-v');
      $('in-kv').value = btn.getAttribute('data-kv');
      $('in-r').value = btn.getAttribute('data-r');
      $('in-i').value = btn.getAttribute('data-i');

      calculate();
    });
  });

  ['in-v', 'in-kv', 'in-r', 'in-i'].forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', () => {
        presets.forEach(p => p.classList.remove('active'));
        calculate();
      });
    }
  });

  // Setup Load Tabs & Sliders
  function setupLoadBench() {
    const tabProp = $('load-tab-prop');
    const tabEv = $('load-tab-ev');
    const tabWinch = $('load-tab-winch');

    const cProp = $('controls-prop');
    const cEv = $('controls-ev');
    const cWinch = $('controls-winch');

    if (tabProp && tabEv && tabWinch) {
      tabProp.addEventListener('click', () => {
        currentLoadMode = 'prop';
        tabProp.classList.add('active');
        tabEv.classList.remove('active');
        tabWinch.classList.remove('active');
        if (cProp) cProp.style.display = 'block';
        if (cEv) cEv.style.display = 'none';
        if (cWinch) cWinch.style.display = 'none';
        calculate();
      });

      tabEv.addEventListener('click', () => {
        currentLoadMode = 'ev';
        tabEv.classList.add('active');
        tabProp.classList.remove('active');
        tabWinch.classList.remove('active');
        if (cProp) cProp.style.display = 'none';
        if (cEv) cEv.style.display = 'block';
        if (cWinch) cWinch.style.display = 'none';
        calculate();
      });

      tabWinch.addEventListener('click', () => {
        currentLoadMode = 'winch';
        tabWinch.classList.add('active');
        tabProp.classList.remove('active');
        tabEv.classList.remove('active');
        if (cProp) cProp.style.display = 'none';
        if (cEv) cEv.style.display = 'none';
        if (cWinch) cWinch.style.display = 'block';
        calculate();
      });
    }

    const loadSliders = [
      'slider-prop-dia', 'slider-prop-pitch',
      'slider-ev-mass', 'slider-ev-slope',
      'slider-winch-mass', 'slider-winch-radius'
    ];

    loadSliders.forEach(id => {
      const el = $(id);
      if (el) {
        el.addEventListener('input', calculate);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupLoadBench();
      if ($('in-v')) calculate();
    });
  } else {
    setupLoadBench();
    if ($('in-v')) calculate();
  }
})();
