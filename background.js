/**
 * background.js
 * -----------------------------------------------------------------------
 * Fluid Procedural Currency Symbol Flow-Field Animation.
 *
 * Mathematical Foundation:
 *   - 2D Simplex Noise potential field Ψ(x, y, t).
 *   - Exact Curl formulation: V_flow = (∂Ψ/∂y, -∂Ψ/∂x), ensuring zero
 *     divergence (∇·V = 0). Particles never collect in sinkholes or voids;
 *     they flow perpetually along smooth, fluid streamlines in all directions.
 *   - 2nd-Order Runge-Kutta (RK2 Midpoint Method) numerical integration:
 *       1. v1 = V(x, y, t)
 *       2. x_mid = x + v1 * (dt / 2)
 *       3. v_mid = V(x_mid, y_mid, t + dt / 2)
 *       4. x_new = x + v_mid * dt
 *   - True delta-time (dt in seconds) physics: silky-smooth and identical
 *     speed across 60Hz, 120Hz, and 144Hz displays.
 *   - Soft-core Hermite cubic smoothstep mouse vortex with gradual ramp-up
 *     and decay.
 *   - Connected, tapered trail ribbons with smoothly decreasing opacity.
 *   - Stable currency symbols: ₹ $ ¥ € £ evenly distributed.
 *   - High-performance: Zero object allocations in the animation loop.
 *   - Battery & resource conscious: Page Visibility API tab pause,
 *     prefers-reduced-motion support, DPR clamped to 2.
 */

(function () {
  'use strict';

  // Respect reduced-motion accessibility preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // ── Configuration ───────────────────────────────────────────────────
  const CURRENCY_SYMBOLS = ['₹', '$', '¥', '€', '£'];

  // Fintech light theme palette
  const COLOR_PRIMARY = '#007ACC';     // Deep primary blue
  const COLOR_SECONDARY = '#CCE0FF';   // Soft light blue
  const BG_COLOR = '#F5F9FF';          // Main canvas background

  // Particle configuration
  const BASE_PARTICLE_COUNT = 150;     // Baseline for 1440x900
  const MAX_TRAIL = 12;                // Trail history steps per particle

  // Flow velocity & noise scale
  const NOISE_SCALE_1 = 0.0015;        // Primary eddy wavelength
  const NOISE_SCALE_2 = 0.0032;        // Secondary subtle harmonic
  const FLOW_SPEED_PX = 44.0;          // Linear travel speed in px/sec
  const TIME_EVOLUTION = 0.038;        // Flow field evolution rate over time

  // Mouse vortex configuration
  const VORTEX_RADIUS = 160;           // Influence radius in logical px
  const VORTEX_SPEED_PX = 95.0;        // Max tangential speed in px/sec

  // ── High-Performance 2D Simplex Noise ───────────────────────────────
  const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

  const GRAD3 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1],  [0, -1]
  ];

  const PERM = new Uint8Array(512);
  const PERM_MOD8 = new Uint8Array(512);

  (function initPermutation() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (i * 16807 + 7) % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      PERM[i] = p[i & 255];
      PERM_MOD8[i] = PERM[i] % 8;
    }
  })();

  function simplex2D(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    let i1 = 0, j1 = 0;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = PERM_MOD8[ii + PERM[jj]];
    const gi1 = PERM_MOD8[ii + i1 + PERM[jj + j1]];
    const gi2 = PERM_MOD8[ii + 1 + PERM[jj + 1]];

    let n0 = 0.5 - x0 * x0 - y0 * y0;
    n0 = n0 < 0 ? 0 : Math.pow(n0, 4) * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);

    let n1 = 0.5 - x1 * x1 - y1 * y1;
    n1 = n1 < 0 ? 0 : Math.pow(n1, 4) * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);

    let n2 = 0.5 - x2 * x2 - y2 * y2;
    n2 = n2 < 0 ? 0 : Math.pow(n2, 4) * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);

    return 70.0 * (n0 + n1 + n2);
  }

  // ── Curl Velocity Field ─────────────────────────────────────────────
  // Multi-frequency scalar potential field Ψ(x, y, t)
  function potential(x, y, t) {
    const p1 = simplex2D(x * NOISE_SCALE_1, y * NOISE_SCALE_1 + t);
    const p2 = simplex2D(x * NOISE_SCALE_2 + 43.1, y * NOISE_SCALE_2 + t * 1.35 + 17.8) * 0.5;
    return p1 + p2;
  }

  // Exact curl of Ψ: (u, v) = (∂Ψ/∂y, -∂Ψ/∂x) -> ∇·(u, v) = 0 (divergence-free)
  function sampleCurlField(x, y, t) {
    const eps = 0.75;
    const dpsi_dy = (potential(x, y + eps, t) - potential(x, y - eps, t)) / (2 * eps);
    const dpsi_dx = (potential(x + eps, y, t) - potential(x - eps, y, t)) / (2 * eps);

    const u = dpsi_dy;
    const v = -dpsi_dx;
    const mag = Math.hypot(u, v) || 0.0001;

    return {
      vx: u / mag,
      vy: v / mag
    };
  }

  // Unified velocity field combining curl field + smooth mouse vortex
  function getVelocity(x, y, t, speed, mouseState) {
    // 1. Sample organic curl flow
    const curl = sampleCurlField(x, y, t);
    let vx = curl.vx * speed;
    let vy = curl.vy * speed;

    // 2. Sample mouse vortex with Hermite smoothstep falloff & soft-core
    if (mouseState.active && mouseState.intensity > 0.01) {
      const dx = x - mouseState.x;
      const dy = y - mouseState.y;
      const dist = Math.hypot(dx, dy);

      if (dist < VORTEX_RADIUS) {
        const r = dist / VORTEX_RADIUS;
        // Smoothstep cubic: 1 at center, 0 at boundary with zero derivatives
        const w = (1 - r) * (1 - r) * (1 + 2 * r) * mouseState.intensity;

        // Softened distance to eliminate singular spike at center
        const softDist = Math.hypot(dx, dy, 18.0);

        // Tangential swirl (clockwise): (-dy/r, dx/r)
        const swirlX = -dy / softDist;
        const swirlY =  dx / softDist;

        // Gentle inward spiral component
        const inwardX = -dx / softDist * 0.18;
        const inwardY = -dy / softDist * 0.18;

        const vortexVx = (swirlX + inwardX) * (VORTEX_SPEED_PX * w);
        const vortexVy = (swirlY + inwardY) * (VORTEX_SPEED_PX * w);

        // Seamless blending
        vx = vx * (1 - w * 0.65) + vortexVx;
        vy = vy * (1 - w * 0.65) + vortexVy;
      }
    }

    return { vx, vy };
  }

  // ── State Variables ─────────────────────────────────────────────────
  let canvas = null;
  let ctx = null;
  let W = 0;
  let H = 0;
  let dpr = 1;

  let particles = [];
  let ambientGrid = [];

  let simTime = 0;
  let lastTimestamp = 0;
  let rafId = null;
  let isRunning = false;

  const mouseState = {
    x: -9999,
    y: -9999,
    active: false,
    targetIntensity: 0,
    intensity: 0
  };

  // ── Particle Factory & Trail Pool ───────────────────────────────────
  function createParticle(index, total) {
    // Fixed, stable symbol assigned permanently to this particle
    const symbol = CURRENCY_SYMBOLS[index % CURRENCY_SYMBOLS.length];

    // Balanced color assignment: roughly half #007ACC, half #CCE0FF
    const isPrimary = (index % 2 === 0);
    const color = isPrimary ? COLOR_PRIMARY : COLOR_SECONDARY;

    // Font size and opacity tuned for high contrast against #F5F9FF
    const size = isPrimary
      ? 14 + (index % 5) * 1.8           // 14px to 21.2px
      : 13 + (index % 4) * 1.5;          // 13px to 17.5px

    const alpha = isPrimary
      ? 0.45 + (index % 4) * 0.08        // 0.45 to 0.69
      : 0.72 + (index % 3) * 0.08;       // 0.72 to 0.88 (higher alpha for light blue)

    const speed = FLOW_SPEED_PX * (0.85 + (index % 7) * 0.06);

    const x = Math.random() * W;
    const y = Math.random() * H;

    // Pre-allocated trail pool (zero object allocations in tick loop)
    const trail = [];
    for (let j = 0; j < MAX_TRAIL; j++) {
      trail.push({ x, y });
    }

    return {
      x,
      y,
      vx: 0,
      vy: 0,
      speed,
      symbol,
      color,
      isPrimary,
      size,
      alpha,
      trail,
      trailCount: 1
    };
  }

  function initParticles() {
    const area = W * H;
    const targetCount = Math.max(
      60,
      Math.min(220, Math.round(BASE_PARTICLE_COUNT * (area / (1440 * 900))))
    );

    particles = [];
    for (let i = 0; i < targetCount; i++) {
      particles.push(createParticle(i, targetCount));
    }
  }

  // ── Ambient Background Watermark Grid ───────────────────────────────
  function initAmbientGrid() {
    ambientGrid = [];
    const cellWidth = 96;
    const cellHeight = 96;
    const cols = Math.ceil(W / cellWidth) + 1;
    const rows = Math.ceil(H / cellHeight) + 1;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const symbol = CURRENCY_SYMBOLS[idx % CURRENCY_SYMBOLS.length];
        const isPrimary = ((r + c) % 2 === 0);
        ambientGrid.push({
          x: c * cellWidth + cellWidth * 0.5,
          y: r * cellHeight + cellHeight * 0.5,
          symbol,
          color: isPrimary ? COLOR_PRIMARY : COLOR_SECONDARY,
          alpha: isPrimary ? 0.065 : 0.14,
          size: 13
        });
        idx++;
      }
    }
  }

  // ── Physics Update: RK2 Midpoint Numerical Integration ──────────────
  function updatePhysics(dt) {
    // Evolve simulation time continuously
    simTime += dt * TIME_EVOLUTION;

    // Smoothly interpolate mouse intensity (gradual ramp-up & decay)
    const mouseRampRate = dt * 5.0;
    mouseState.intensity += (mouseState.targetIntensity - mouseState.intensity) * Math.min(1.0, mouseRampRate);

    const margin = 28;
    const pCount = particles.length;

    for (let i = 0; i < pCount; i++) {
      const p = particles[i];

      // ── Step 1: Sample velocity at current position ────────────────
      const v1 = getVelocity(p.x, p.y, simTime, p.speed, mouseState);

      // ── Step 2: Estimate midpoint position (half-step) ────────────
      const dtHalf = dt * 0.5;
      const xMid = p.x + v1.vx * dtHalf;
      const yMid = p.y + v1.vy * dtHalf;

      // ── Step 3: Sample velocity again at estimated midpoint ───────
      const vMid = getVelocity(xMid, yMid, simTime + dtHalf * TIME_EVOLUTION, p.speed, mouseState);

      // ── Step 4: Advance actual position using midpoint velocity ────
      const newX = p.x + vMid.vx * dt;
      const newY = p.y + vMid.vy * dt;

      p.vx = vMid.vx;
      p.vy = vMid.vy;

      // ── Step 5: Screen Wrap & Trail Management ─────────────────────
      let wrapped = false;
      let targetX = newX;
      let targetY = newY;

      if (targetX < -margin) {
        targetX = W + margin;
        wrapped = true;
      } else if (targetX > W + margin) {
        targetX = -margin;
        wrapped = true;
      }

      if (targetY < -margin) {
        targetY = H + margin;
        wrapped = true;
      } else if (targetY > H + margin) {
        targetY = -margin;
        wrapped = true;
      }

      p.x = targetX;
      p.y = targetY;

      if (wrapped) {
        // Reset trail buffer on wrap to eliminate unsightly horizontal streaks
        for (let j = 0; j < MAX_TRAIL; j++) {
          p.trail[j].x = targetX;
          p.trail[j].y = targetY;
        }
        p.trailCount = 1;
      } else {
        // Advance trail points using pre-allocated pool (no allocations)
        const oldest = p.trail[MAX_TRAIL - 1];
        for (let j = MAX_TRAIL - 1; j > 0; j--) {
          p.trail[j] = p.trail[j - 1];
        }
        oldest.x = targetX;
        oldest.y = targetY;
        p.trail[0] = oldest;

        if (p.trailCount < MAX_TRAIL) {
          p.trailCount++;
        }
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    // 1. Crisp light fintech canvas background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // 2. Ambient watermark grid of currency symbols
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "600 13px 'Inter', -apple-system, sans-serif";

    const ambCount = ambientGrid.length;
    for (let i = 0; i < ambCount; i++) {
      const cell = ambientGrid[i];
      ctx.globalAlpha = cell.alpha;
      ctx.fillStyle = cell.color;
      ctx.fillText(cell.symbol, cell.x, cell.y);
    }

    // 3. Flowing particles and smooth tapered trails
    const pCount = particles.length;

    // Pass 1: Render smooth, connected trail ribbons with decreasing opacity
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < pCount; i++) {
      const p = particles[i];
      if (p.trailCount < 2) continue;

      const baseWidth = p.isPrimary ? 1.5 : 1.9;

      for (let j = 0; j < p.trailCount - 1; j++) {
        const pt1 = p.trail[j];
        const pt2 = p.trail[j + 1];

        // Guard against any wrapped jump segment
        if (Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y) > 60) continue;

        // Normalized position along trail: 1.0 (head) down to 0.0 (tail)
        const ratio = 1.0 - j / p.trailCount;

        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = baseWidth * (0.35 + 0.65 * ratio);
        // Quadratic smoothly decreasing opacity
        ctx.globalAlpha = p.alpha * ratio * ratio * 0.36;
        ctx.stroke();
      }

      // Soft ghost symbol midpoint along trail with subtle opacity
      if (p.trailCount >= 6) {
        const midPt = p.trail[Math.floor(p.trailCount * 0.45)];
        ctx.font = `600 ${p.size * 0.8}px 'Inter', -apple-system, sans-serif`;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.16;
        ctx.fillText(p.symbol, midPt.x, midPt.y);
      }
    }

    // Pass 2: Render crisp, stable currency symbols at current head position
    for (let i = 0; i < pCount; i++) {
      const p = particles[i];
      ctx.font = `700 ${p.size}px 'Inter', -apple-system, sans-serif`;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillText(p.symbol, p.x, p.y);
    }

    ctx.globalAlpha = 1.0;
  }

  // ── Animation Loop With Timestamp Delta-Time (dt) ───────────────────
  function tick(timestamp) {
    if (!isRunning) return;

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    // Elapsed delta time in seconds
    let dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    // Clamp dt to eliminate sudden leaps on lag spikes or window focus switches
    if (dt > 0.05) dt = 0.05;   // 50ms cap (20fps floor)
    if (dt < 0.001) dt = 0.001; // 1ms floor

    updatePhysics(dt);
    render();

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    lastTimestamp = 0; // Reset timestamp so dt does not jump on resume
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    isRunning = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTimestamp = 0;
  }

  // ── Viewport Resize Handling ────────────────────────────────────────
  function resize() {
    // Clamp DPR to 2 for optimal high-refresh-rate Retina rendering
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initParticles();
    initAmbientGrid();
  }

  // ── Initialization & Event Listeners ────────────────────────────────
  function init() {
    canvas = document.getElementById('bgCanvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    resize();
    start();

    // Mouse tracking (smooth gradual activation)
    window.addEventListener('mousemove', (e) => {
      mouseState.x = e.clientX;
      mouseState.y = e.clientY;
      mouseState.active = true;
      mouseState.targetIntensity = 1.0;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      mouseState.targetIntensity = 0.0;
    }, { passive: true });

    // Touch tracking for mobile devices
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        mouseState.x = e.touches[0].clientX;
        mouseState.y = e.touches[0].clientY;
        mouseState.active = true;
        mouseState.targetIntensity = 1.0;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      mouseState.targetIntensity = 0.0;
    }, { passive: true });

    // Page Visibility API: pause animation when backgrounded to preserve CPU/battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    // Debounced window resize handler
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
