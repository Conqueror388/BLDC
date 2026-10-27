/**
 * BLDC Motor Lab - Interactive Vector Simulator
 * Simulates 3-Phase 6-Step Trapeze Commutation & Hall Effect Sensing
 * Retro-Technical Laboratory Edition
 */

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  
  // 6-Step Commutation Pattern [Phase A, Phase B, Phase C]
  // 1 = High (+V), -1 = Low (GND), 0 = Floating (High-Z)
  const COMMUTATION_STEPS = [
    [1, -1, 0],  // Step 1: A -> B, C float
    [1, 0, -1],  // Step 2: A -> C, B float
    [0, 1, -1],  // Step 3: B -> C, A float
    [-1, 1, 0],  // Step 4: B -> A, C float
    [-1, 0, 1],  // Step 5: C -> A, B float
    [0, -1, 1]   // Step 6: C -> B, A float
  ];

  const PHASE_NAMES = ['A', 'B', 'C'];
  const PHASE_COLORS = ['#E05315', '#00C9A7', '#3D84FF'];
  const PHASE_AXES = [90, 210, 330]; // Geometric coil axes in degrees
  const CX = 210, CY = 210;

  function $(id) { return document.getElementById(id); }
  function mod(n, m) { return ((n % m) + m) % m; }
  function degToRad(deg) { return deg * Math.PI / 180; }
  
  function polarToCartesian(r, deg) {
    const rad = degToRad(deg);
    return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)];
  }

  function createSvgEl(name, attrs, parent) {
    const el = document.createElementNS(SVG_NS, name);
    for (let k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        el.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(el);
    return el;
  }

  // --- SVG Init ---
  const svg = $('motor-svg');
  if (!svg) return; // Not on simulator page

  // Clear previous if any
  svg.innerHTML = `
    <defs>
      <radialGradient id="rotorGradN" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#E53935"/>
        <stop offset="100%" stop-color="#8E0000"/>
      </radialGradient>
      <radialGradient id="rotorGradS" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#2563EB"/>
        <stop offset="100%" stop-color="#1E3A8A"/>
      </radialGradient>
    </defs>
  `;

  // Outer Casing & Stator Lamination (Crisp Hairline Metal Finish)
  createSvgEl('circle', { cx: CX, cy: CY, r: 204, fill: '#0A0D12', stroke: '#1F2633', 'stroke-width': 2 }, svg);
  createSvgEl('circle', { cx: CX, cy: CY, r: 182, fill: '#10151E', stroke: '#2A3344', 'stroke-width': 1.5 }, svg);
  createSvgEl('circle', { cx: CX, cy: CY, r: 92, fill: 'none', stroke: '#1F2633', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg);

  // Stator Teeth & Coils (6 poles: A1, B1, C1, A2, B2, C2)
  const coils = [];
  const phasePoles = [
    { p: 0, s: 0, deg: 90, label: 'A1' },
    { p: 1, s: 0, deg: 210, label: 'B1' },
    { p: 2, s: 0, deg: 330, label: 'C1' },
    { p: 0, s: 1, deg: 270, label: 'A2' },
    { p: 1, s: 1, deg: 30, label: 'B2' },
    { p: 2, s: 1, deg: 150, label: 'C2' }
  ];

  phasePoles.forEach(pole => {
    const pos = polarToCartesian(138, pole.deg);
    const toothPos = polarToCartesian(102, pole.deg);

    // Stator tooth iron shoe
    createSvgEl('line', {
      x1: toothPos[0], y1: toothPos[1],
      x2: pos[0], y2: pos[1],
      stroke: '#242D3D',
      'stroke-width': 14
    }, svg);

    // Coil winding representation (mechanical square-ish / rounded-subtle)
    const circ = createSvgEl('circle', {
      cx: pos[0], cy: pos[1], r: 27,
      fill: '#151A24',
      stroke: '#2E384A',
      'stroke-width': 2,
      'data-phase': pole.p,
      'data-name': pole.label
    }, svg);

    const text = createSvgEl('text', {
      x: pos[0], y: pos[1] + 1,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      fill: '#8E9BAE',
      'font-weight': '700',
      'font-family': 'var(--font-mono)',
      'font-size': '14px'
    }, svg);
    text.textContent = pole.label;

    coils.push({ ...pole, circ, text });
  });

  // Stator Magnetic Field Vector (Phosphor Amber Pull Arrow)
  const fieldLine = createSvgEl('line', {
    x1: CX, y1: CY, x2: CX, y2: CY,
    stroke: '#FF8800',
    'stroke-width': 3,
    'stroke-dasharray': '5 3'
  }, svg);

  const fieldHead = createSvgEl('polygon', {
    points: '0,0 0,0 0,0',
    fill: '#FF8800'
  }, svg);

  // 3 Hall Effect Sensors on outer periphery
  const hallElements = [];
  const hallAngles = [90, 210, 330];

  hallAngles.forEach((deg, idx) => {
    const hPos = polarToCartesian(188, deg);
    const hGroup = createSvgEl('g', { class: 'hall-probe', 'data-index': idx }, svg);

    const hRect = createSvgEl('rect', {
      x: hPos[0] - 11, y: hPos[1] - 11, width: 22, height: 22,
      fill: '#0A0D12',
      stroke: '#2E384A',
      'stroke-width': 1.5,
      rx: 2
    }, hGroup);

    const hText = createSvgEl('text', {
      x: hPos[0], y: hPos[1] + 1,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      fill: '#8E9BAE',
      'font-size': '9px',
      'font-weight': '700',
      'font-family': 'var(--font-mono)'
    }, hGroup);
    hText.textContent = `H${idx + 1}`;

    hallElements.push({ group: hGroup, rect: hRect, text: hText, deg });
  });

  // Rotor Group (Permanent Magnet)
  const rotor = createSvgEl('g', { id: 'rotor-group' }, svg);

  // North Pole Half
  createSvgEl('path', {
    d: `M ${CX} ${CY - 60} A 60 60 0 0 1 ${CX} ${CY + 60} Z`,
    fill: 'url(#rotorGradN)',
    stroke: '#2A3344',
    'stroke-width': 1.5
  }, rotor);

  // South Pole Half
  createSvgEl('path', {
    d: `M ${CX} ${CY - 60} A 60 60 0 0 0 ${CX} ${CY + 60} Z`,
    fill: 'url(#rotorGradS)',
    stroke: '#2A3344',
    'stroke-width': 1.5
  }, rotor);

  // North / South Labels
  const labelN = createSvgEl('text', {
    x: CX + 30, y: CY,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    fill: '#FFFFFF',
    'font-size': '20px',
    'font-weight': '700',
    'font-family': 'var(--font-mono)'
  }, rotor);
  labelN.textContent = 'N';

  const labelS = createSvgEl('text', {
    x: CX - 30, y: CY,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    fill: '#FFFFFF',
    'font-size': '20px',
    'font-weight': '700',
    'font-family': 'var(--font-mono)'
  }, rotor);
  labelS.textContent = 'S';

  // Center Shaft with Technical Brass Bearing
  createSvgEl('circle', { cx: CX, cy: CY, r: 13, fill: '#0A0D12', stroke: '#8E9BAE', 'stroke-width': 2 }, rotor);
  createSvgEl('circle', { cx: CX, cy: CY, r: 4, fill: '#FF8800' }, rotor);

  // --- Oscilloscope Strip (Commutation Timing Diagram) ---
  const strip = $('strip-svg');
  let stripHl = null;

  if (strip) {
    const X0 = 42, CW = 51, STRIP_H = 130;
    stripHl = createSvgEl('rect', {
      x: X0, y: 8, width: CW, height: STRIP_H - 24,
      fill: 'rgba(255, 136, 0, 0.16)',
      stroke: '#FF8800',
      'stroke-width': 1.5,
      rx: 2
    }, strip);

    for (let r = 0; r < 3; r++) {
      const yc = 26 + r * 36, amp = 10;
      createSvgEl('line', {
        x1: X0, x2: X0 + 6 * CW, y1: yc, y2: yc,
        stroke: '#1F2633',
        'stroke-dasharray': '3 3'
      }, strip);

      let d = '';
      for (let k = 0; k < 6; k++) {
        const y = yc - COMMUTATION_STEPS[k][r] * amp;
        const x1 = X0 + k * CW, x2 = x1 + CW;
        d += (k === 0 ? 'M ' : ' L ') + x1 + ' ' + y + ' L ' + x2 + ' ' + y;
      }
      createSvgEl('path', {
        d: d,
        fill: 'none',
        stroke: PHASE_COLORS[r],
        'stroke-width': 2.5,
        'stroke-linejoin': 'round'
      }, strip);

      const lab = createSvgEl('text', {
        x: 16, y: yc + 1,
        fill: PHASE_COLORS[r],
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': 'var(--font-mono)',
        'font-weight': '700',
        'font-size': '12px'
      }, strip);
      lab.textContent = PHASE_NAMES[r];
    }

    for (let n = 0; n < 6; n++) {
      const stepNum = createSvgEl('text', {
        x: X0 + n * CW + CW / 2, y: STRIP_H - 4,
        'text-anchor': 'middle',
        fill: '#8E9BAE',
        'font-family': 'var(--font-mono)',
        'font-size': '10px',
        'font-weight': '600'
      }, strip);
      stepNum.textContent = `S${n + 1}`;
    }
  }

  // --- State Variables ---
  let theta = 20; // Rotor mechanical angle in degrees
  let dir = 1;    // 1 = Forward (CW), -1 = Reverse (CCW)
  let isRunning = true;
  let throttle = 40; // 0 to 100%

  // DOM Elements
  const rStep = $('r-step');
  const rHall = $('r-hall');
  const rPath = $('r-path');
  const rRpm = $('r-rpm');
  const rAngle = $('r-angle');
  const bPlay = $('btn-play');
  const bStepFwd = $('btn-step-fwd');
  const bStepRev = $('btn-step-rev');
  const bDir = $('btn-dir');
  const thr = $('throttle-slider');
  const thrOut = $('throttle-val');

  const phasePillA = $('phase-pill-a');
  const phasePillB = $('phase-pill-b');
  const phasePillC = $('phase-pill-c');

  function updatePhasePill(el, val, phaseLetter) {
    if (!el) return;
    el.className = 'phase-pill';
    if (val === 1) {
      el.classList.add(`${phaseLetter.toLowerCase()}-high`);
      el.innerHTML = `${phaseLetter}: <b>HIGH (+V)</b>`;
    } else if (val === -1) {
      el.classList.add(`${phaseLetter.toLowerCase()}-low`);
      el.innerHTML = `${phaseLetter}: <b>LOW (GND)</b>`;
    } else {
      el.classList.add('floating');
      el.innerHTML = `${phaseLetter}: <i>FLOAT (Z)</i>`;
    }
  }

  function render() {
    const sector = theta / 60;
    const k = dir > 0 ? mod(Math.floor(sector) + 1, 6) : mod(Math.floor(sector) - 2, 6);
    const statorAngle = 60 * (k + 1);

    rotor.setAttribute('transform', `rotate(${-theta} ${CX} ${CY})`);
    labelN.setAttribute('transform', `rotate(${theta} ${CX + 30} ${CY})`);
    labelS.setAttribute('transform', `rotate(${theta} ${CX - 30} ${CY})`);

    const tip = polarToCartesian(116, statorAngle);
    const end = polarToCartesian(98, statorAngle);
    const a1 = polarToCartesian(96, statorAngle + 9);
    const a2 = polarToCartesian(96, statorAngle - 9);

    fieldLine.setAttribute('x2', end[0]);
    fieldLine.setAttribute('y2', end[1]);
    fieldHead.setAttribute('points', `${tip.join(',')} ${a1.join(',')} ${a2.join(',')}`);

    const stepPattern = COMMUTATION_STEPS[k];

    coils.forEach(coil => {
      const sgn = stepPattern[coil.p];
      const isActive = sgn !== 0;
      if (isActive) {
        const isNorth = (sgn > 0) === (coil.s === 0);
        coil.circ.setAttribute('fill', PHASE_COLORS[coil.p]);
        coil.circ.setAttribute('fill-opacity', '0.85');
        coil.circ.setAttribute('stroke', '#ECEFF4');
        coil.circ.setAttribute('stroke-width', '2.5');
        coil.text.setAttribute('fill', '#0A0D12');
        coil.text.textContent = isNorth ? 'S' : 'N';
      } else {
        coil.circ.setAttribute('fill', '#151A24');
        coil.circ.setAttribute('fill-opacity', '1');
        coil.circ.setAttribute('stroke', '#2E384A');
        coil.circ.setAttribute('stroke-width', '1.5');
        coil.text.setAttribute('fill', '#8E9BAE');
        coil.text.textContent = coil.label;
      }
    });

    let hallCode = '';
    hallElements.forEach((h, idx) => {
      const isNorthNear = Math.cos(degToRad(theta - h.deg)) > 0;
      if (isNorthNear) {
        h.rect.setAttribute('fill', '#00D2A0');
        h.rect.setAttribute('stroke', '#FFFFFF');
        h.text.setAttribute('fill', '#0A0D12');
        hallCode += '1';
      } else {
        h.rect.setAttribute('fill', '#0A0D12');
        h.rect.setAttribute('stroke', '#2E384A');
        h.text.setAttribute('fill', '#8E9BAE');
        hallCode += '0';
      }
    });

    if (stripHl) {
      stripHl.setAttribute('x', 42 + k * 51);
    }

    const srcPhase = PHASE_NAMES[stepPattern.indexOf(1)];
    const sinkPhase = PHASE_NAMES[stepPattern.indexOf(-1)];

    if (rStep) rStep.textContent = `${k + 1} / 6`;
    if (rHall) rHall.textContent = hallCode;
    if (rPath) rPath.textContent = `${srcPhase} → ${sinkPhase}`;
    if (rAngle) rAngle.textContent = `${Math.round(theta)}°`;

    const estRpm = Math.round((throttle / 100) * 1800);
    if (rRpm) rRpm.textContent = `${estRpm}`;

    updatePhasePill(phasePillA, stepPattern[0], 'A');
    updatePhasePill(phasePillB, stepPattern[1], 'B');
    updatePhasePill(phasePillC, stepPattern[2], 'C');
  }

  function syncControlButtons() {
    if (bPlay) {
      bPlay.innerHTML = isRunning ? '[ PAUSE ]' : '[ RUN ]';
    }
    if (bDir) {
      bDir.innerHTML = dir > 0 ? 'DIR: CW' : 'DIR: CCW';
    }
  }

  if (bPlay) {
    bPlay.addEventListener('click', () => {
      isRunning = !isRunning;
      syncControlButtons();
    });
  }

  if (bStepFwd) {
    bStepFwd.addEventListener('click', () => {
      isRunning = false;
      theta = mod(theta + 60, 360);
      syncControlButtons();
      render();
    });
  }

  if (bStepRev) {
    bStepRev.addEventListener('click', () => {
      isRunning = false;
      theta = mod(theta - 60, 360);
      syncControlButtons();
      render();
    });
  }

  if (bDir) {
    bDir.addEventListener('click', () => {
      dir = -dir;
      syncControlButtons();
      render();
    });
  }

  if (thr) {
    thr.addEventListener('input', () => {
      throttle = parseFloat(thr.value) || 0;
      if (thrOut) thrOut.textContent = `${throttle}%`;
    });
  }

  let lastTime = performance.now();
  function loop(currentTime) {
    const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
    lastTime = currentTime;

    if (isRunning && throttle > 0) {
      const speedDegPerSec = (throttle / 100) * 420;
      theta = mod(theta + dir * speedDegPerSec * dt, 360);
      render();
    }

    requestAnimationFrame(loop);
  }

  syncControlButtons();
  render();
  requestAnimationFrame(loop);
})();
