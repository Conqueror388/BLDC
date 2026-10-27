/**
 * BLDC Motor Lab - Virtual Arduino & ESC Hardware Simulator
 * Real-time PWM 50Hz Oscilloscope, Web Audio ESC Arming Chimes, and Serial Monitor
 */

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  let isArmed = false;
  let audioCtx = null;
  let audioGain = null;
  let audioOsc = null;
  let serialInterval = null;
  let animFrame = null;
  let motorAngle = 0;

  // Audio Synthesizer for ESC Beeps & Motor Whine
  function initAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioCtx = new AudioContext();
      audioGain = audioCtx.createGain();
      audioGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      audioGain.connect(audioCtx.destination);
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
    }
  }

  function playTone(freq, durationMs) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  }

  function playArmingChime() {
    initAudio();
    if (!audioCtx) return;
    // Classic 3-tone ESC arming sequence (1200Hz, 1500Hz, 2400Hz)
    setTimeout(() => playTone(1200, 120), 100);
    setTimeout(() => playTone(1500, 120), 300);
    setTimeout(() => playTone(2400, 350), 550);
  }

  // Serial Monitor Line Logger
  let serialSeconds = 0;
  function logSerial(msg, type = '') {
    const screen = $('serial-screen');
    if (!screen) return;
    const timeStr = `[T+${serialSeconds.toFixed(2)}s]`;
    const line = document.createElement('div');
    line.className = `serial-line ${type}`;
    line.textContent = `${timeStr} ${msg}`;
    screen.appendChild(line);
    screen.scrollTop = screen.scrollHeight;

    // Cap at 60 lines
    while (screen.children.length > 60) {
      screen.removeChild(screen.firstChild);
    }
  }

  // Oscilloscope Waveform Renderer
  const scopeCanvas = $('scope-canvas');
  function drawPwmWaveform(pulseWidthUs) {
    if (!scopeCanvas) return;
    const ctx = scopeCanvas.getContext('2d');
    const W = scopeCanvas.width;
    const H = scopeCanvas.height;

    ctx.fillStyle = '#06080C';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#151D2A';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // PWM Signal: Frame Period = 20,000us (50Hz)
    // Scale: W pixels represents approx 24,000us
    const usToPx = W / 24000;
    const highW = pulseWidthUs * usToPx;
    const periodW = 20000 * usToPx;

    const yLow = H - 28;
    const yHigh = 28;

    ctx.strokeStyle = '#00D2A0';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0, 210, 160, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    // Pulse 1
    ctx.moveTo(10, yLow);
    ctx.lineTo(25, yLow);
    ctx.lineTo(25, yHigh);
    ctx.lineTo(25 + highW, yHigh);
    ctx.lineTo(25 + highW, yLow);
    ctx.lineTo(25 + periodW, yLow);

    // Pulse 2 (next frame)
    const p2Start = 25 + periodW;
    ctx.lineTo(p2Start, yHigh);
    ctx.lineTo(p2Start + highW, yHigh);
    ctx.lineTo(p2Start + highW, yLow);
    ctx.lineTo(W - 10, yLow);

    ctx.stroke();
    ctx.shadowBlur = 0;

    // Measurement Annotations
    ctx.fillStyle = '#FF7700';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`HIGH: ${pulseWidthUs}μs`, 30, yHigh - 8);

    ctx.fillStyle = '#8B95A5';
    ctx.fillText('PERIOD: 20,000μs (50 Hz)', 70, yLow + 18);
  }

  function updateBench() {
    const slider = $('pot-slider');
    const pulseWidth = slider ? parseInt(slider.value, 10) : 1000;
    const throttlePct = Math.round(((pulseWidth - 1000) / 1000) * 100);
    const adcRaw = Math.round((throttlePct / 100) * 1023);
    const dutyPct = ((pulseWidth / 20000) * 100).toFixed(1);
    const rpm = isArmed ? Math.round((throttlePct / 100) * 11500) : 0;

    if ($('val-pot-pw')) $('val-pot-pw').textContent = `${pulseWidth} μs`;
    if ($('val-pot-pct')) $('val-pot-pct').textContent = `${throttlePct}%`;
    if ($('val-pot-adc')) $('val-pot-adc').textContent = `${adcRaw}`;
    if ($('val-duty-pct')) $('val-duty-pct').textContent = `${dutyPct}%`;
    if ($('val-bench-rpm')) $('val-bench-rpm').textContent = `${rpm.toLocaleString()} RPM`;

    drawPwmWaveform(pulseWidth);

    // Animate motor prop
    const propGroup = $('prop-spinner');
    if (propGroup) {
      const speedDeg = isArmed ? (throttlePct / 100) * 24 + 1 : 0;
      motorAngle = (motorAngle + speedDeg) % 360;
      propGroup.setAttribute('transform', `rotate(${motorAngle} 60 60)`);
    }

    // Audio Continuous Whine
    if (audioCtx && audioOsc && isArmed) {
      if (throttlePct > 0) {
        audioGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        audioOsc.frequency.setValueAtTime(200 + throttlePct * 12, audioCtx.currentTime);
      } else {
        audioGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      }
    }
  }

  function loopAnimation() {
    updateBench();
    animFrame = requestAnimationFrame(loopAnimation);
  }

  function initDiyBench() {
    const btnArm = $('btn-arm-esc');
    const btnAudio = $('btn-toggle-audio');
    const slider = $('pot-slider');

    if (btnArm) {
      btnArm.addEventListener('click', () => {
        isArmed = !isArmed;
        if (isArmed) {
          btnArm.className = 'btn btn-primary btn-sm';
          btnArm.textContent = '[ ESC ARMED // RUNNING ]';
          if ($('esc-led')) $('esc-led').style.background = '#00D2A0';
          playArmingChime();
          logSerial('Writing 1000us idle pulse to clear lockout...', 'sys');
          setTimeout(() => logSerial('ESC confirmation tones received. Ready.', 'sys'), 600);
        } else {
          btnArm.className = 'btn btn-secondary btn-sm';
          btnArm.textContent = '[ POWER ON & ARM ESC ]';
          if ($('esc-led')) $('esc-led').style.background = '#EF4444';
          logSerial('ESC powered off / disarmed.', 'alert');
        }
      });
    }

    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        initAudio();
        if (!audioCtx) return;
        if (!audioOsc) {
          audioOsc = audioCtx.createOscillator();
          audioOsc.type = 'sawtooth';
          audioOsc.frequency.setValueAtTime(200, audioCtx.currentTime);
          audioGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          audioOsc.connect(audioGain);
          audioOsc.start();
          btnAudio.textContent = '🔊 AUDIO: ON';
          btnAudio.classList.add('active');
        } else {
          audioGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          audioOsc.stop();
          audioOsc.disconnect();
          audioOsc = null;
          btnAudio.textContent = '🔇 AUDIO: MUTED';
          btnAudio.classList.remove('active');
        }
      });
    }

    if (slider) {
      slider.addEventListener('input', () => {
        const pw = slider.value;
        const thr = Math.round(((pw - 1000) / 1000) * 100);
        if (isArmed) {
          logSerial(`PWM: ${pw}us | THROTTLE: ${thr}% | ADC: ${Math.round((thr/100)*1023)}`);
        }
      });
    }

    // Periodic Serial status heartbeat
    serialInterval = setInterval(() => {
      serialSeconds += 1.5;
      if (isArmed) {
        const pw = slider ? slider.value : 1000;
        const thr = Math.round(((pw - 1000) / 1000) * 100);
        const rpm = Math.round((thr / 100) * 11500);
        logSerial(`SYS_OK: PWM=${pw}us · THR=${thr}% · RPM=${rpm}`);
      }
    }, 1800);

    // Initial draw
    updateBench();
    loopAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiyBench);
  } else {
    initDiyBench();
  }
})();
