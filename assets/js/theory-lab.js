/**
 * BLDC Motor Lab - Interactive 6-Step Inverter & Commutation Laboratory
 * Simulates 6-Step MOSFET Bridge, Wye current loops, and Stator Flux Vectors
 */

(function () {
  'use strict';

  const STEPS_DATA = [
    {
      step: 1,
      angle: '000° – 060°',
      hall: '1 0 1',
      phaseA: { state: 'HIGH (+V)', class: 'on-high' },
      phaseB: { state: 'LOW (GND)', class: 'on-low' },
      phaseC: { state: 'FLOAT (Z)', class: 'floating' },
      activeMosfets: ['Q1 (A High)', 'Q4 (B Low)'],
      currentLoop: 'A → B (Phase C Floating)',
      vectorAngle: 60,
      description: 'Q1 connects Phase A to V_BUS; Q4 connects Phase B to GND. Current flows from A through the central neutral star point and sinks into B. Phase C is disconnected. Stator flux points at 60°, exerting peak CW torque on the rotor.'
    },
    {
      step: 2,
      angle: '060° – 120°',
      hall: '1 0 0',
      phaseA: { state: 'HIGH (+V)', class: 'on-high' },
      phaseB: { state: 'FLOAT (Z)', class: 'floating' },
      phaseC: { state: 'LOW (GND)', class: 'on-low' },
      activeMosfets: ['Q1 (A High)', 'Q6 (C Low)'],
      currentLoop: 'A → C (Phase B Floating)',
      vectorAngle: 120,
      description: 'Q1 remains ON; Phase B is opened while Q6 pulls Phase C to GND. Current diverts from Phase B into Phase C. The stator magnetic vector steps forward by 60° to 120° electrical, maintaining torque synchronicity.'
    },
    {
      step: 3,
      angle: '120° – 180°',
      hall: '1 1 0',
      phaseA: { state: 'FLOAT (Z)', class: 'floating' },
      phaseB: { state: 'HIGH (+V)', class: 'on-high' },
      phaseC: { state: 'LOW (GND)', class: 'on-low' },
      activeMosfets: ['Q3 (B High)', 'Q6 (C Low)'],
      currentLoop: 'B → C (Phase A Floating)',
      vectorAngle: 180,
      description: 'Q1 turns OFF; Phase A becomes floating for sensorless zero-crossing sampling. Q3 turns ON, sourcing current into Phase B while Q6 continues sinking through Phase C. Stator vector points at 180°.'
    },
    {
      step: 4,
      angle: '180° – 240°',
      hall: '0 1 0',
      phaseA: { state: 'LOW (GND)', class: 'on-low' },
      phaseB: { state: 'HIGH (+V)', class: 'on-high' },
      phaseC: { state: 'FLOAT (Z)', class: 'floating' },
      activeMosfets: ['Q3 (B High)', 'Q2 (A Low)'],
      currentLoop: 'B → A (Phase C Floating)',
      vectorAngle: 240,
      description: 'Q3 remains ON; Q6 turns OFF. Q2 turns ON, pulling Phase A to GND. Current flows in the reverse direction through Phase A, creating an inverted magnetic polarity. Stator vector points at 240°.'
    },
    {
      step: 5,
      angle: '240° – 300°',
      hall: '0 1 1',
      phaseA: { state: 'LOW (GND)', class: 'on-low' },
      phaseB: { state: 'FLOAT (Z)', class: 'floating' },
      phaseC: { state: 'HIGH (+V)', class: 'on-high' },
      activeMosfets: ['Q5 (C High)', 'Q2 (A Low)'],
      currentLoop: 'C → A (Phase B Floating)',
      vectorAngle: 300,
      description: 'Q3 turns OFF, allowing Phase B to float. Q5 turns ON, sourcing current into Phase C while Q2 continues sinking through Phase A. Stator vector rotates to 300°.'
    },
    {
      step: 6,
      angle: '300° – 360°',
      hall: '0 0 1',
      phaseA: { state: 'FLOAT (Z)', class: 'floating' },
      phaseB: { state: 'LOW (GND)', class: 'on-low' },
      phaseC: { state: 'HIGH (+V)', class: 'on-high' },
      activeMosfets: ['Q5 (C High)', 'Q4 (B Low)'],
      currentLoop: 'C → B (Phase A Floating)',
      vectorAngle: 360,
      description: 'Q5 remains ON; Q2 turns OFF. Q4 turns ON, sinking current through Phase B. Phase A floats. Completes the full 360° electrical cycle, returning seamlessly to Step 1.'
    }
  ];

  let currentStepIdx = 0;
  let autoCycleTimer = null;

  function $(id) { return document.getElementById(id); }

  function renderStep(idx) {
    currentStepIdx = idx;
    const data = STEPS_DATA[idx];

    // Update Step Buttons
    for (let i = 0; i < 6; i++) {
      const btn = $(`step-btn-${i + 1}`);
      if (btn) {
        if (i === idx) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    }

    // Telemetry displays
    if ($('t-active-step')) $('t-active-step').textContent = `STEP 0${data.step} / 06`;
    if ($('t-elec-angle')) $('t-elec-angle').textContent = data.angle;
    if ($('t-hall-code')) $('t-hall-code').textContent = data.hall;
    if ($('t-active-loop')) $('t-active-loop').textContent = data.currentLoop;
    if ($('t-active-mosfets')) $('t-active-mosfets').textContent = data.activeMosfets.join(' + ');
    if ($('t-vector-angle')) $('t-vector-angle').textContent = `${data.vectorAngle}°`;
    if ($('t-step-desc')) $('t-step-desc').textContent = data.description;

    // Phase Badges
    const pA = $('t-pill-a');
    const pB = $('t-pill-b');
    const pC = $('t-pill-c');

    if (pA) {
      pA.className = `phase-pill ${data.phaseA.class}`;
      pA.innerHTML = `PHASE A: <b>${data.phaseA.state}</b>`;
    }
    if (pB) {
      pB.className = `phase-pill ${data.phaseB.class}`;
      pB.innerHTML = `PHASE B: <b>${data.phaseB.state}</b>`;
    }
    if (pC) {
      pC.className = `phase-pill ${data.phaseC.class}`;
      pC.innerHTML = `PHASE C: <b>${data.phaseC.state}</b>`;
    }

    // MOSFET Bridge Transistor states (Q1 to Q6)
    // Q1: A-High, Q2: A-Low
    // Q3: B-High, Q4: B-Low
    // Q5: C-High, Q6: C-Low
    const mosfets = {
      q1: data.step === 1 || data.step === 2,
      q2: data.step === 4 || data.step === 5,
      q3: data.step === 3 || data.step === 4,
      q4: data.step === 1 || data.step === 6,
      q5: data.step === 5 || data.step === 6,
      q6: data.step === 2 || data.step === 3
    };

    for (const [qId, isOn] of Object.entries(mosfets)) {
      const el = $(`mosfet-${qId}`);
      if (el) {
        el.className = `mosfet-chip ${isOn ? 'on' : 'off'}`;
        const name = el.getAttribute('data-name') || qId.toUpperCase();
        el.innerHTML = `${name} <b>${isOn ? '[ ON ]' : '[ OFF ]'}</b>`;
      }
    }

    // Update Stator Vector Dial Needle
    const needle = $('vector-needle');
    if (needle) {
      needle.setAttribute('transform', `rotate(${data.vectorAngle} 100 100)`);
    }
  }

  function toggleAutoCycle() {
    const btn = $('btn-auto-cycle');
    if (autoCycleTimer) {
      clearInterval(autoCycleTimer);
      autoCycleTimer = null;
      if (btn) btn.textContent = '[ AUTO ADVANCE ]';
    } else {
      autoCycleTimer = setInterval(() => {
        const next = (currentStepIdx + 1) % 6;
        renderStep(next);
      }, 1400);
      if (btn) btn.textContent = '[ PAUSE AUTO ]';
    }
  }

  function initTheoryLab() {
    // Bind Step Buttons
    for (let i = 0; i < 6; i++) {
      const btn = $(`step-btn-${i + 1}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (autoCycleTimer) toggleAutoCycle();
          renderStep(i);
        });
      }
    }

    const btnNext = $('btn-step-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (autoCycleTimer) toggleAutoCycle();
        renderStep((currentStepIdx + 1) % 6);
      });
    }

    const btnPrev = $('btn-step-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (autoCycleTimer) toggleAutoCycle();
        renderStep((currentStepIdx + 5) % 6);
      });
    }

    const btnAuto = $('btn-auto-cycle');
    if (btnAuto) {
      btnAuto.addEventListener('click', toggleAutoCycle);
    }

    renderStep(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheoryLab);
  } else {
    initTheoryLab();
  }
})();
