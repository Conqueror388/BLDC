/**
 * BLDC Motor Lab - Interactive Virtual 1,000-Hour Stress Test & Spec Comparator
 */

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  let simTimer = null;
  let simHour = 0;
  const MAX_HOURS = 1000;

  function updateStressGauges(hr) {
    if ($('stress-hr-counter')) {
      $('stress-hr-counter').textContent = `T+ ${String(Math.round(hr)).padStart(4, '0')} HOURS`;
    }

    // 1. Brushed DC
    const brushLife = Math.max(0, 100 - (hr / 340) * 100);
    if ($('bar-brushed-life')) $('bar-brushed-life').style.width = `${brushLife}%`;
    if ($('val-brushed-life')) $('val-brushed-life').textContent = `${Math.round(brushLife)}%`;
    
    const brushedStatus = $('status-brushed');
    if (brushedStatus) {
      if (hr >= 340) {
        brushedStatus.className = 'badge badge-warning';
        brushedStatus.textContent = 'FAILED: BRUSHES DISINTEGRATED';
        if ($('spark-indicator')) $('spark-indicator').textContent = '⚠️ SEVERE COMMUTATOR ARCS';
      } else if (hr >= 200) {
        brushedStatus.className = 'badge badge-info';
        brushedStatus.textContent = 'DEGRADED: HEAVY CARBON WEAR';
        if ($('spark-indicator')) $('spark-indicator').textContent = '⚡ VISIBLE SPARKING';
      } else {
        brushedStatus.className = 'badge badge-success';
        brushedStatus.textContent = 'OPERATIONAL (WEARING)';
        if ($('spark-indicator')) $('spark-indicator').textContent = 'NOMINAL ARCS';
      }
    }

    // 2. Stepper Motor
    const stepperTemp = Math.min(88, 25 + (hr > 0 ? 55 + Math.sin(hr * 0.1) * 8 : 0));
    if ($('bar-stepper-temp')) $('bar-stepper-temp').style.width = `${(stepperTemp / 100) * 100}%`;
    if ($('val-stepper-temp')) $('val-stepper-temp').textContent = `${Math.round(stepperTemp)}°C`;
    
    const stepperStatus = $('status-stepper');
    if (stepperStatus) {
      if (hr > 50) {
        stepperStatus.className = 'badge badge-info';
        stepperStatus.textContent = 'HOT COPPER LOSS (85°C)';
      } else {
        stepperStatus.className = 'badge badge-success';
        stepperStatus.textContent = 'STABLE HOLDING';
      }
    }

    // 3. BLDC Motor
    const bldcBearingLife = Math.max(93, 100 - (hr / 15000) * 100);
    if ($('bar-bldc-life')) $('bar-bldc-life').style.width = `${bldcBearingLife}%`;
    if ($('val-bldc-life')) $('val-bldc-life').textContent = `${bldcBearingLife.toFixed(1)}%`;

    const bldcStatus = $('status-bldc');
    if (bldcStatus) {
      bldcStatus.className = 'badge badge-success';
      bldcStatus.textContent = 'NOMINAL (>14,000 HRS REMAINING)';
    }
  }

  function runStressSimulation() {
    const btn = $('btn-run-stress');
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
      if (btn) btn.textContent = '[ RESUME SIMULATION ]';
      return;
    }

    if (simHour >= MAX_HOURS) {
      simHour = 0;
    }

    if (btn) btn.textContent = '[ PAUSE SIMULATION ]';

    simTimer = setInterval(() => {
      simHour += 15;
      if (simHour >= MAX_HOURS) {
        simHour = MAX_HOURS;
        clearInterval(simTimer);
        simTimer = null;
        if (btn) btn.textContent = '[ RE-RUN 1,000-HR TEST ]';
      }
      updateStressGauges(simHour);
    }, 45);
  }

  function resetStressSimulation() {
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
    simHour = 0;
    const btn = $('btn-run-stress');
    if (btn) btn.textContent = '[ RUN 1,000-HR TEST ]';
    updateStressGauges(0);
  }

  // Multi-Spec Metric Comparison Data
  const SPEC_DATA = {
    bldc: { name: 'Brushless DC (BLDC)', eff: 92, life: 95, rpm: 98, density: 92, driverCost: 40 },
    brushed: { name: 'Brushed DC', eff: 68, life: 25, rpm: 45, density: 55, driverCost: 95 },
    stepper: { name: 'Stepper Motor', eff: 60, life: 85, rpm: 20, density: 60, driverCost: 70 },
    pmsm: { name: 'PMSM (AC Sync)', eff: 96, life: 98, rpm: 85, density: 96, driverCost: 30 }
  };

  function updateSpecRadar(motorA, motorB) {
    const a = SPEC_DATA[motorA];
    const b = SPEC_DATA[motorB];
    if (!a || !b) return;

    const metrics = [
      { id: 'eff', label: 'ENERGY EFFICIENCY' },
      { id: 'life', label: 'LIFESPAN & DURABILITY' },
      { id: 'rpm', label: 'PEAK VELOCITY (RPM)' },
      { id: 'density', label: 'POWER DENSITY' },
      { id: 'driverCost', label: 'DRIVER SIMPLICITY (LOW BOM)' }
    ];

    let html = '';
    metrics.forEach(m => {
      html += `
        <div style="margin-bottom: 0.85rem;">
          <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.75rem; margin-bottom: 0.35rem;">
            <span style="color: var(--text-muted);">${m.label}</span>
            <span>
              <b style="color: var(--accent-amber);">${a.name.split(' ')[0]}: ${a[m.id]}%</b> vs 
              <b style="color: #00D2A0;">${b.name.split(' ')[0]}: ${b[m.id]}%</b>
            </span>
          </div>
          <div style="display: flex; gap: 4px; height: 8px; background: #0A0D12; border-radius: var(--radius-pill); overflow: hidden; border: 1px solid var(--border-line);">
            <div style="width: ${a[m.id]}%; background: var(--accent-amber); border-radius: var(--radius-pill); transition: width 0.3s;"></div>
            <div style="width: ${b[m.id]}%; background: #00D2A0; border-radius: var(--radius-pill); transition: width 0.3s;"></div>
          </div>
        </div>
      `;
    });

    if ($('spec-comparison-bars')) {
      $('spec-comparison-bars').innerHTML = html;
    }
  }

  function initComparisonBench() {
    const btnRun = $('btn-run-stress');
    if (btnRun) btnRun.addEventListener('click', runStressSimulation);

    const btnReset = $('btn-reset-stress');
    if (btnReset) btnReset.addEventListener('click', resetStressSimulation);

    const selectA = $('spec-motor-a');
    const selectB = $('spec-motor-b');

    if (selectA && selectB) {
      const onChange = () => updateSpecRadar(selectA.value, selectB.value);
      selectA.addEventListener('change', onChange);
      selectB.addEventListener('change', onChange);
      onChange();
    }

    updateStressGauges(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComparisonBench);
  } else {
    initComparisonBench();
  }
})();
