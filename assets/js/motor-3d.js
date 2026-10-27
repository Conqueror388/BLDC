/**
 * BLDC Motor Lab - Three.js Interactive 3D Motor Engine
 * Real-time 3D Outrunner BLDC machine with orbit controls,
 * 10-layer exploded mechanical assembly (38 individual components),
 * CAD central alignment axis, interactive raycast hover inspection,
 * and 6-step phase coil excitation glow.
 */

(function () {
  'use strict';

  function initWhenReady() {
    if (typeof THREE === 'undefined') {
      setTimeout(initWhenReady, 100);
      return;
    }
    setup3DMotor();
  }

  function setup3DMotor() {
    const container = document.getElementById('canvas-3d-wrap');
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 450;
    const height = container.clientHeight || 430;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080C);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 10.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // OrbitControls
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 1.7;
      controls.minDistance = 3.0;
      controls.maxDistance = 20;
      controls.target.set(0, 0.25, 0);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0x283142, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(6, 9, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    fillLight.position.set(-6, -2, -5);
    scene.add(fillLight);

    const amberRim = new THREE.PointLight(0xff7700, 1.8, 12);
    amberRim.position.set(0, 4, 3);
    scene.add(amberRim);

    // CAD Centerline Alignment Axis
    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -3.2, 0),
      new THREE.Vector3(0, 4.2, 0)
    ]);
    const axisMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.18,
      gapSize: 0.12,
      opacity: 0.0,
      transparent: true
    });
    const centerline = new THREE.Line(axisGeo, axisMat);
    centerline.computeLineDistances();
    scene.add(centerline);

    // Materials
    const metalShaftMat = new THREE.MeshStandardMaterial({
      color: 0xdde2ea,
      metalness: 0.95,
      roughness: 0.12
    });

    const brassBearingMat = new THREE.MeshStandardMaterial({
      color: 0xecb23e,
      metalness: 0.9,
      roughness: 0.25
    });

    const bearingSteelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2
    });

    const statorCoreMat = new THREE.MeshStandardMaterial({
      color: 0x1e2736,
      metalness: 0.65,
      roughness: 0.5
    });

    const copperMatA = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.82,
      roughness: 0.32,
      emissive: 0x000000
    });

    const copperMatB = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.82,
      roughness: 0.32,
      emissive: 0x000000
    });

    const copperMatC = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.82,
      roughness: 0.32,
      emissive: 0x000000
    });

    const phaseMaterials = [copperMatA, copperMatB, copperMatC];

    const rotorBellMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      metalness: 0.88,
      roughness: 0.22
    });

    const rotorLipMat = new THREE.MeshStandardMaterial({
      color: 0xff7700,
      metalness: 0.78,
      roughness: 0.25
    });

    const northMagnetMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.6,
      roughness: 0.3
    });

    const southMagnetMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      metalness: 0.6,
      roughness: 0.3
    });

    const clipMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.35
    });

    // Inspectable meshes array for raycaster
    const inspectableMeshes = [];

    // Master Rotating Group (Rotor-side)
    const rotorSpinGroup = new THREE.Group();
    scene.add(rotorSpinGroup);

    // Master Stationary Group (Stator-side)
    const statorStationaryGroup = new THREE.Group();
    scene.add(statorStationaryGroup);

    // =========================================================================
    // PART 1: Hardened Steel Shaft (Rotor-side)
    // =========================================================================
    const partShaft = new THREE.Group();
    const shaftMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3.2, 32),
      metalShaftMat
    );
    shaftMesh.userData = {
      name: "SUS420 Stainless Drive Shaft",
      spec: "Precision-ground 4mm high-tensile shaft transferring rotational torque"
    };
    partShaft.add(shaftMesh);
    inspectableMeshes.push(shaftMesh);
    rotorSpinGroup.add(partShaft);

    // =========================================================================
    // PART 2: CNC Aluminum Bell Cap & Cooling Vents (Rotor-side)
    // =========================================================================
    const partBellCap = new THREE.Group();
    const bellTopMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.68, 0.16, 48),
      rotorLipMat
    );
    bellTopMesh.userData = {
      name: "6061-T6 CNC Bell Cap",
      spec: "Anodized rotor top plate with radial centrifugal air evacuation ports"
    };
    partBellCap.add(bellTopMesh);
    inspectableMeshes.push(bellTopMesh);

    // Top shaft brass hub collar
    const topCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.22, 24),
      brassBearingMat
    );
    topCollar.userData = {
      name: "Rotor Shaft Hub Collar",
      spec: "Press-fit brass interface securing shaft to rotor bell housing"
    };
    partBellCap.add(topCollar);
    inspectableMeshes.push(topCollar);

    // 6 Cooling Vents
    for (let v = 0; v < 6; v++) {
      const vAng = (v / 6) * Math.PI * 2;
      const vent = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16),
        statorCoreMat
      );
      vent.position.set(Math.cos(vAng) * 1.05, 0, Math.sin(vAng) * 1.05);
      vent.userData = {
        name: "Rotor Cooling Vent",
        spec: "Centrifugal ventilation port evacuating heat from stator coils"
      };
      partBellCap.add(vent);
      inspectableMeshes.push(vent);
    }
    rotorSpinGroup.add(partBellCap);

    // =========================================================================
    // PART 3: Outer Rotor Bell Shell / Flux Ring (Rotor-side)
    // =========================================================================
    const partBellWall = new THREE.Group();
    const bellWallMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.68, 1.68, 1.05, 48, 1, true),
      rotorBellMat
    );
    bellWallMesh.userData = {
      name: "Outer Bell Flux Ring (Can)",
      spec: "Back-iron magnetic housing channeling and closing the rotor flux circuit"
    };
    partBellWall.add(bellWallMesh);
    inspectableMeshes.push(bellWallMesh);
    rotorSpinGroup.add(partBellWall);

    // =========================================================================
    // PART 4: 14x NdFeB Permanent Magnets (Rotor-side)
    // =========================================================================
    const partMagnets = new THREE.Group();
    const NUM_MAGNETS = 14;
    const baseMagnetRadius = 1.58;
    const magnetMeshes = [];

    for (let m = 0; m < NUM_MAGNETS; m++) {
      const mAngle = (m / NUM_MAGNETS) * Math.PI * 2;
      const isNorth = m % 2 === 0;

      const magnet = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.85, 0.38),
        isNorth ? northMagnetMat : southMagnetMat
      );
      magnet.rotation.y = -mAngle + Math.PI / 2;
      magnet.userData = {
        name: isNorth ? "NdFeB Magnet (NORTH Pole - 🔴)" : "NdFeB Magnet (SOUTH Pole - 🔵)",
        spec: "N52SH high-temperature sintered rare-earth permanent magnet pole",
        baseAngle: mAngle
      };
      partMagnets.add(magnet);
      magnetMeshes.push(magnet);
      inspectableMeshes.push(magnet);
    }
    rotorSpinGroup.add(partMagnets);

    // =========================================================================
    // PART 5: Upper Ball Bearing (Stator-side)
    // =========================================================================
    const partBearingTop = new THREE.Group();
    const bTopOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.18, 32),
      bearingSteelMat
    );
    const bTopInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.19, 24),
      brassBearingMat
    );
    bTopOuter.userData = {
      name: "Upper Ball Bearing (MR104ZZ)",
      spec: "Precision deep-groove shielded bearing supporting dynamic axial load"
    };
    partBearingTop.add(bTopOuter);
    partBearingTop.add(bTopInner);
    inspectableMeshes.push(bTopOuter);
    statorStationaryGroup.add(partBearingTop);

    // =========================================================================
    // PART 6: 12x 3-Phase Copper Windings (Stator-side)
    // =========================================================================
    const partWindings = new THREE.Group();
    const NUM_COILS = 12;
    const baseCoilRadius = 1.1;
    const coilMeshes = [];

    for (let c = 0; c < NUM_COILS; c++) {
      const cAngle = (c / NUM_COILS) * Math.PI * 2;
      const phaseIdx = c % 3;
      const phaseName = ["Phase A (🟠)", "Phase B (🌐)", "Phase C (🟣)"][phaseIdx];

      const coil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.55, 16),
        phaseMaterials[phaseIdx]
      );
      coil.rotation.z = Math.PI / 2;
      coil.rotation.y = -cAngle;
      coil.userData = {
        name: `${phaseName} Coil Winding`,
        spec: "Class-H 200°C enameled magnet wire wound around silicon steel stator teeth",
        baseAngle: cAngle
      };
      partWindings.add(coil);
      coilMeshes.push({ mesh: coil, phase: phaseIdx });
      inspectableMeshes.push(coil);
    }
    statorStationaryGroup.add(partWindings);

    // =========================================================================
    // PART 7: 12-Slot Silicon Steel Stator Core & Teeth (Datum zero)
    // =========================================================================
    const partStatorCore = new THREE.Group();
    const yoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.8, 32),
      statorCoreMat
    );
    yoke.userData = {
      name: "Stator Center Yoke",
      spec: "0.2mm low-loss silicon steel laminations minimizing eddy current losses"
    };
    partStatorCore.add(yoke);
    inspectableMeshes.push(yoke);

    // 12 Teeth
    for (let t = 0; t < NUM_COILS; t++) {
      const tAngle = (t / NUM_COILS) * Math.PI * 2;
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.65, 0.5),
        statorCoreMat
      );
      tooth.position.set(Math.cos(tAngle) * 0.95, 0, Math.sin(tAngle) * 0.95);
      tooth.rotation.y = -tAngle + Math.PI / 2;
      tooth.userData = {
        name: `Stator Armature Tooth #${t + 1}`,
        spec: "Concentrated magnetic pole teeth directing flux towards the airgap"
      };
      partStatorCore.add(tooth);
      inspectableMeshes.push(tooth);
    }
    statorStationaryGroup.add(partStatorCore);

    // =========================================================================
    // PART 8: Lower Ball Bearing (Stator-side)
    // =========================================================================
    const partBearingBottom = new THREE.Group();
    const bBotOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.18, 32),
      bearingSteelMat
    );
    const bBotInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.19, 24),
      brassBearingMat
    );
    bBotOuter.userData = {
      name: "Lower Ball Bearing (MR104ZZ)",
      spec: "Dual-shielded bottom radial guide bearing stabilizing motor shaft rotation"
    };
    partBearingBottom.add(bBotOuter);
    partBearingBottom.add(bBotInner);
    inspectableMeshes.push(bBotOuter);
    statorStationaryGroup.add(partBearingBottom);

    // =========================================================================
    // PART 9: Stator Base Mounting Hub / Flange (Stator-side)
    // =========================================================================
    const partBaseMount = new THREE.Group();
    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.45, 0.35, 32),
      statorCoreMat
    );
    basePlate.userData = {
      name: "Stator Base Mounting Flange",
      spec: "CNC aluminum mounting hub with 16x19mm M3 motor fastener pattern"
    };
    partBaseMount.add(basePlate);
    inspectableMeshes.push(basePlate);

    // 4 M3 Screw Hole Inserts
    for (let s = 0; s < 4; s++) {
      const sAng = (s / 4) * Math.PI * 2;
      const screwHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.38, 16),
        brassBearingMat
      );
      screwHole.position.set(Math.cos(sAng) * 0.95, 0, Math.sin(sAng) * 0.95);
      screwHole.userData = {
        name: "M3 Threaded Mounting Insert",
        spec: "Countersunk threaded fastener hole for drone arm or motor bracket"
      };
      partBaseMount.add(screwHole);
      inspectableMeshes.push(screwHole);
    }
    statorStationaryGroup.add(partBaseMount);

    // =========================================================================
    // PART 10: Shaft Retaining E-Clip Ring & Brass Washer (Stator-side)
    // =========================================================================
    const partClip = new THREE.Group();
    const clipRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.08, 24),
      clipMat
    );
    clipRing.userData = {
      name: "Shaft Retaining E-Clip & Brass Shim",
      spec: "Spring steel retaining ring providing axial preload against lower bearing"
    };
    partClip.add(clipRing);
    inspectableMeshes.push(clipRing);
    statorStationaryGroup.add(partClip);

    // =========================================================================
    // Exploded View Dynamics & Smooth Separation
    // =========================================================================
    let targetExplode = 0.0;
    let currentExplode = 0.0;

    function applyExplodedTransform(factor) {
      // Centerline CAD axis visibility
      axisMat.opacity = factor * 0.45;

      // 1. Shaft (slides highest up the central axis)
      partShaft.position.y = 0.5 + factor * 2.8;

      // 2. Bell Cap (lifts above wall)
      partBellCap.position.y = 0.65 + factor * 2.0;

      // 3. Bell Wall (lifts above magnets)
      partBellWall.position.y = 0.1 + factor * 1.3;

      // 4. Magnets (expand radially outward AND lift to reveal each individual pole)
      const magnetRadius = baseMagnetRadius + factor * 0.72;
      const magnetY = 0.1 + factor * 0.65;
      for (let m = 0; m < NUM_MAGNETS; m++) {
        const angle = magnetMeshes[m].userData.baseAngle;
        magnetMeshes[m].position.set(
          Math.cos(angle) * magnetRadius,
          magnetY,
          Math.sin(angle) * magnetRadius
        );
      }

      // 5. Upper Bearing (lifts out of upper cup)
      partBearingTop.position.y = 0.45 + factor * 0.35;

      // 6. Copper Windings (expand radially outwards from iron teeth)
      const coilRadius = baseCoilRadius + factor * 0.38;
      const coilY = 0.0 + factor * 0.1;
      for (let c = 0; c < NUM_COILS; c++) {
        const angle = coilMeshes[c].mesh.userData.baseAngle;
        coilMeshes[c].mesh.position.set(
          Math.cos(angle) * coilRadius,
          coilY,
          Math.sin(angle) * coilRadius
        );
      }

      // 7. Stator Core remains at datum y = 0.0
      partStatorCore.position.y = 0.0;

      // 8. Lower Bearing (drops out of lower cup)
      partBearingBottom.position.y = -0.45 - factor * 0.35;

      // 9. Stator Base Mount Hub (drops downward)
      partBaseMount.position.y = -0.65 - factor * 1.05;

      // 10. Shaft Retaining E-Clip (drops to the bottom)
      partClip.position.y = -0.92 - factor * 1.7;
    }

    // Set initial assembled positions
    applyExplodedTransform(0.0);

    // UI Wireups
    const btnExplode = document.getElementById('btn-3d-explode');
    const explodeSlider = document.getElementById('explode-slider');
    const explodeVal = document.getElementById('explode-val');
    const badgeParts = document.getElementById('part-inspector-badge');
    const tagPart = document.getElementById('exploded-part-tag');

    function updateBadgeLabels(factor) {
      if (explodeVal) {
        explodeVal.textContent = Math.round(factor * 100) + '%';
      }
      if (btnExplode) {
        btnExplode.textContent = factor > 0.5 ? '[ ASSEMBLE MOTOR ]' : '[ EXPLODED VIEW ]';
      }
      if (badgeParts) {
        if (factor > 0.05) {
          badgeParts.textContent = 'EXPLODED: 10 SUB-ASSEMBLIES · 38 DISTINCT PARTS';
          badgeParts.style.borderColor = 'rgba(255, 119, 0, 0.45)';
          badgeParts.style.color = '#FFA37B';
        } else {
          badgeParts.textContent = 'ASSEMBLED: 14-POLE OUTRUNNER MACHINE';
          badgeParts.style.borderColor = 'rgba(0, 229, 255, 0.3)';
          badgeParts.style.color = 'var(--accent-cyan)';
        }
      }
    }

    if (btnExplode) {
      btnExplode.addEventListener('click', () => {
        targetExplode = targetExplode > 0.5 ? 0.0 : 1.0;
        if (explodeSlider) explodeSlider.value = Math.round(targetExplode * 100);
      });
    }

    if (explodeSlider) {
      explodeSlider.addEventListener('input', () => {
        targetExplode = (parseFloat(explodeSlider.value) || 0) / 100;
      });
    }

    // Reset Camera
    const btnResetCam = document.getElementById('btn-3d-reset');
    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => {
        camera.position.set(0, 3.2, 10.5);
        if (controls) controls.target.set(0, 0.25, 0);
      });
    }

    // View Switcher (3D vs 2D)
    const tab3D = document.getElementById('tab-view-3d');
    const tab2D = document.getElementById('tab-view-2d');
    const stage3D = document.getElementById('stage-view-3d');
    const stage2D = document.getElementById('stage-view-2d');

    if (tab3D && tab2D && stage3D && stage2D) {
      tab3D.addEventListener('click', () => {
        tab3D.classList.add('active');
        tab2D.classList.remove('active');
        stage3D.style.display = 'block';
        stage2D.style.display = 'none';
        onResize();
      });

      tab2D.addEventListener('click', () => {
        tab2D.classList.add('active');
        tab3D.classList.remove('active');
        stage3D.style.display = 'none';
        stage2D.style.display = 'block';
      });
    }

    // Throttle integration
    const throttleSlider = document.getElementById('throttle-slider');
    let rotorSpeed = 0.02;

    function updateRotorSpeed() {
      if (throttleSlider) {
        const val = parseFloat(throttleSlider.value) || 0;
        rotorSpeed = (val / 100) * 0.12 + 0.005;
      }
    }
    if (throttleSlider) {
      throttleSlider.addEventListener('input', updateRotorSpeed);
    }
    updateRotorSpeed();

    // 6-Step Commutation Steps for 3D Coil Emissive Glow
    const COMMUTATION_3D = [
      [1, -1, 0],
      [1, 0, -1],
      [0, 1, -1],
      [-1, 1, 0],
      [-1, 0, 1],
      [0, -1, 1]
    ];

    let currentStep3D = 0;
    let stepTimer = 0;

    function updateCoilEmissive(stepIdx) {
      const step = COMMUTATION_3D[stepIdx];
      // Phase A
      if (step[0] !== 0) {
        copperMatA.emissive.setHex(step[0] > 0 ? 0xff5500 : 0xb45309);
        copperMatA.color.setHex(0xff7700);
      } else {
        copperMatA.emissive.setHex(0x000000);
        copperMatA.color.setHex(0x6b3b14);
      }
      // Phase B
      if (step[1] !== 0) {
        copperMatB.emissive.setHex(step[1] > 0 ? 0x00d2a0 : 0x007a5e);
        copperMatB.color.setHex(0x00e6a8);
      } else {
        copperMatB.emissive.setHex(0x000000);
        copperMatB.color.setHex(0x6b3b14);
      }
      // Phase C
      if (step[2] !== 0) {
        copperMatC.emissive.setHex(step[2] > 0 ? 0x2979ff : 0x1a4fb0);
        copperMatC.color.setHex(0x3d84ff);
      } else {
        copperMatC.emissive.setHex(0x000000);
        copperMatC.color.setHex(0x6b3b14);
      }
    }

    // =========================================================================
    // Raycaster Mouse Hover Part Inspection
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    renderer.domElement.addEventListener('mousemove', (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    renderer.domElement.addEventListener('mouseleave', () => {
      mouse.x = -999;
      mouse.y = -999;
      if (tagPart) {
        tagPart.textContent = 'HOVER A PART TO INSPECT';
        tagPart.style.color = 'var(--accent-amber)';
      }
    });

    function checkRaycast() {
      if (mouse.x === -999) return;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(inspectableMeshes, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit && hit.userData && hit.userData.name) {
          if (tagPart) {
            tagPart.textContent = `🎯 ${hit.userData.name}`;
            tagPart.style.color = '#38BDF8';
          }
          return;
        }
      }
      if (tagPart) {
        tagPart.textContent = currentExplode > 0.1 ? '10 DISTINCT MECHANICAL STACKS' : 'HOVER A PART TO INSPECT';
        tagPart.style.color = 'var(--accent-amber)';
      }
    }

    // Window Resize Handler
    function onResize() {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 450;
      const h = container.clientHeight || 430;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // =========================================================================
    // Animation Loop
    // =========================================================================
    let lastTime = performance.now();

    function animate(now) {
      requestAnimationFrame(animate);

      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Rotate the entire Rotor assembly (Shaft, Bell Cap, Bell Wall, Magnets)
      rotorSpinGroup.rotation.y += rotorSpeed;

      // Smooth Interpolation for Exploded Factor
      const diff = targetExplode - currentExplode;
      if (Math.abs(diff) > 0.001) {
        currentExplode += diff * 0.1;
        applyExplodedTransform(currentExplode);
        updateBadgeLabels(currentExplode);
      }

      // Check part hover under raycaster
      checkRaycast();

      // Cycle Commutation step based on rotor angle
      stepTimer += delta * (rotorSpeed * 60);
      if (stepTimer >= 1) {
        stepTimer = 0;
        currentStep3D = (currentStep3D + 1) % 6;
        updateCoilEmissive(currentStep3D);
      }

      if (controls) controls.update();
      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
    updateCoilEmissive(0);
    updateBadgeLabels(0.0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
  } else {
    initWhenReady();
  }
})();
