# ⚡ BLDC Motor Lab

An interactive engineering laboratory and visual simulation platform dedicated to 3-Phase Brushless DC (BLDC) motors, electromagnetic commutation, drive electronics, and sizing dynamics.

Designed for engineers, roboticists, drone builders, and STEM educators. Built with pure modern web technologies—Three.js WebGL 3D, HTML5, CSS3, Vector SVG, Web Audio API, and vanilla JavaScript. **Zero heavy dependencies, lightweight, and instantly deployable on GitHub Pages.**

---

## 🚀 Live Demo & GitHub Pages Setup

This repository is pre-configured for one-click deployment on **GitHub Pages**:

1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "feat: 3D interactive BLDC motor laboratory and multi-page engineering bench"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```
2. Navigate to your repository on GitHub:
   - Go to **Settings** &rarr; **Pages** (under Code and automation).
   - Under **Build and deployment** &rarr; **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.
3. Your live site will be ready at:
   ```
   https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/
   ```

---

## 📂 Multi-Page Architecture & Interactive Platforms

Rather than dumping everything onto a single, cluttered webpage, the project is structured into dedicated, modular pages—each equipped with a dedicated hands-on interactive platform:

| Page | URL | Interactive Platform & Features |
| :--- | :--- | :--- |
| **Interactive Simulator** | [`index.html`](index.html) | **Three.js 3D WebGL Motor Bench**: 14-pole outrunner bell with CNC vents, 12-slot stator core, coil excitation glow, 360° mouse OrbitControls, exploded view slider, and toggleable 2D vector cross-section with real-time Hall sensor decoding. |
| **Working Theory** | [`theory.html`](theory.html) | **Interactive 6-Step Inverter Bench**: Live 6-MOSFET bridge with clickable switching steps, active phase indicators, stator vector compass dial, and mathematically audited electromagnetic physics (Lorentz force, Back-EMF 30° delay, Star vs Delta line relations). |
| **Engineering Calculator** | [`calculator.html`](calculator.html) | **Real-World Load Equilibrium Bench**: Solves aerodynamic propeller quadratic drag ($T \propto N^2$), EV scooter rolling/aerodynamic friction, and robotic winch payloads against motor torque-speed curves. Computes thrust, speed, efficiency, and $I^2R$ copper loss. |
| **Motor Comparison** | [`comparison.html`](comparison.html) | **Virtual 1,000-Hour Endurance Wear Simulator**: Live wear testing demonstrating brushed DC commutator brush erosion (failure at ~340 hrs), stepper motor thermal hysteresis, and BLDC solid-state wear-free longevity (>14,000 hrs). Features an interactive **Spec Comparator** and **Selection Wizard**. |
| **DIY Arduino Lab** | [`diy-lab.html`](diy-lab.html) | **Virtual Arduino & ESC Hardware Bench**: Live 50Hz PWM oscilloscope drawing microsecond pulse durations (1000µs–2000µs), synthesized Web Audio API motor chimes & acoustic frequency whine, interactive spinning propeller, and live 115200 baud serial monitor. |

---

## 🎨 UI/UX & Visual Design

- **Ergonomic Soft-Curved Geometry:** Clean, modern rounded contours (`12px`, `16px`, `20px`, pill `9999px`) with zero harsh rectangular box edges.
- **Ambient Soft Depth Shadows:** Diffuse ambient card elevation with subtle edge highlights (`0 10px 30px -5px rgba(0, 0, 0, 0.45)`) eliminating brutalist flat boxes.
- **Precision Typography:** Distinctive, readable pairing featuring `Outfit` for display headings, `Plus Jakarta Sans` for body text, and `JetBrains Mono` for engineering metrics and code.
- **Phase Color Coding:**
  - 🟠 **Phase A:** `#FF6B35` (Amber Orange)
  - 🌐 **Phase B:** `#00E5FF` (Electric Cyan)
  - 🟣 **Phase C:** `#B388FF` (Vivid Purple)
  - 🟢 **Hall Active / High:** `#10B981` (Emerald Green)

---

## 🛠️ Technology Stack

- **3D Graphics Engine:** Three.js (r128) WebGL with custom mesh geometry, radial rotor poles, copper windings, and OrbitControls.
- **Audio Synthesis:** Web Audio API for hardware ESC startup beeps and commutation acoustic whine.
- **Vector SVG Engine:** Dynamic mathematical generation of 2D stator coils, rotor flux vectors, and load equilibrium charts.
- **Zero Build Tools Required:** Pure standard HTML5, CSS3, and ES6+ JavaScript—no bundlers or npm build steps required to run or deploy.

---

## 📄 License

This project is open-source and released under the [MIT License](LICENSE).
Feel free to use it for university labs, makerspaces, or personal projects!
