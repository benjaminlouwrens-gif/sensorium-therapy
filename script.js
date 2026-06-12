/* ============================================================
   Sensorium Therapy — interactions
   1. Theme toggle (dark mode — light sections only)
   2. "Under construction" startup pop-up
   3. Neuron centerpiece: scroll-driven 3D canvas (soma, dendrites,
      axon, action-potential particles, bacteriophages, glass shards)
   4. Glass cards orbiting the neuron, scroll-locked to center
   5. Contact form (Formspree w/ mailto fallback)
   ============================================================ */

/* ----------------------- CONFIG ----------------------- */
const CONFIG = {
  email: "sanette@sensoriumtherapy.com",
  // TODO: create a free form at https://formspree.io (sign in with
  // sanette@sensoriumtherapy.com) and paste the form ID here, e.g. "mqkrgwyz".
  // Until then the form falls back to opening the visitor's mail app.
  formspreeId: "",
};

/* ============================================================
   THEME TOGGLE — dark mode affects the light sections only.
   The neuron section is always dark and is untouched by this.
   (The pre-paint attribute is set inline in <head> to avoid flash;
    this block just wires the button + persistence.)
   ============================================================ */
(function initTheme() {
  const btn = document.getElementById("themeToggle");
  const root = document.documentElement;
  function apply(theme) {
    root.setAttribute("data-theme", theme);
    if (btn) btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }
  // initial: saved → else light
  const saved = (() => { try { return localStorage.getItem("theme"); } catch { return null; } })();
  apply(saved === "dark" ? "dark" : "light");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next);
    try { localStorage.setItem("theme", next); } catch {}
  });
})();

/* ============================================================
   UNDER-CONSTRUCTION POP-UP — once per browser session
   ============================================================ */
(function initNotice() {
  const modal = document.getElementById("noticeModal");
  if (!modal) return;
  let seen = false;
  try { seen = sessionStorage.getItem("noticeSeen") === "1"; } catch {}
  if (seen) { modal.remove(); return; }

  const close = () => {
    modal.classList.remove("is-open");
    try { sessionStorage.setItem("noticeSeen", "1"); } catch {}
    setTimeout(() => modal.remove(), 300);
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };

  modal.querySelector(".notice__btn").addEventListener("click", close);
  modal.querySelector(".notice__backdrop").addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  // open after first paint, focus the button
  requestAnimationFrame(() => {
    modal.classList.add("is-open");
    modal.querySelector(".notice__btn").focus();
  });
})();

/* ----------------------- CARD DATA -----------------------
   8 cards, three families: 2 OT (merged), 5 RELIA steps, 1 methods.
   Order is the narrative arc the helix reveals, canopy → root.    */
const CARDS = [
  {
    tag: "ot", tagLabel: "OT · For Children", title: "Relational Safety & Symbolic Growth",
    body: "It begins with co-regulation — a child borrows calm from a safe adult long before they can make their own. From that attachment foundation grows the highest reach of development: imagination, language, and play.",
  },
  {
    tag: "relia", tagLabel: "RELIA · A", title: "Attunement & Integration",
    body: "We weave new patterns into daily life — at home, school, work, and in relationships — so regulation becomes who you are, not something you perform.",
    quote: "Lasting change in how the nervous system reads the world, responds to stress, and experiences self and others.",
  },
  {
    tag: "relia", tagLabel: "RELIA · I", title: "Identity",
    body: "We honor who you are, not just what you do — rewriting stories like “I'm too much” or “I can't cope” in a more compassionate, neurobiologically accurate way.",
  },
  {
    tag: "relia", tagLabel: "RELIA · L", title: "Listening",
    body: "We slow down enough to hear the body inside — tension, breath, gut feelings — and relationships outside: tone, pacing, cues.",
    quote: "Instead of drowning in sensations and emotions, you start to understand them and respond more flexibly.",
  },
  {
    tag: "method", tagLabel: "Tools & Approaches", title: "Tools & Approaches",
    body: "A developmental approach — meeting each person where they are and building the next capacity — woven through DIR Floortime® and warm, attuned play. Sanette also draws on Tomatis® neuro-auditory listening and Interactive Metronome® for rhythm and timing, and is integrating HeartMath® coherence and Sandplay to deepen the work.",
  },
  {
    tag: "ot", tagLabel: "OT · For Children", title: "Sensory & Emotional Regulation",
    body: "Touch, movement, sound, and gravity become one coherent picture instead of scattered noise — and big feelings find a body that can hold them, riding the waves up into excitement and down into calm without tipping into overwhelm.",
  },
  {
    tag: "relia", tagLabel: "RELIA · E", title: "Embodied",
    body: "We work through the body, not just the head — movement, posture, breath, and play create new regulated states, strengthening interoception: the felt sense of what's happening inside.",
  },
  {
    tag: "relia", tagLabel: "RELIA · R", title: "Relational",
    body: "The taproot. A consistent, non-shaming, attuned relationship where your nervous system can finally relax and feel seen.",
    quote: "Without relational safety, the nervous system will not risk new experiences.",
  },
];

/* ----------------------- RENDER CARDS ----------------------- */
function cardHTML(c) {
  return `
    <span class="tree-card__tag tree-card__tag--${c.tag}">${c.tagLabel}</span>
    <h3>${c.title}</h3>
    <p>${c.body}</p>
    ${c.quote ? `<blockquote>${c.quote}</blockquote>` : ""}`;
}

const desktopWrap = document.getElementById("treeCards");
const mobileWrap = document.getElementById("treeCardsMobile");

CARDS.forEach((c) => {
  if (desktopWrap) {
    const el = document.createElement("article");
    el.className = "tree-card";
    el.innerHTML = cardHTML(c);
    desktopWrap.appendChild(el);
  }
  if (mobileWrap) {
    const mEl = document.createElement("article");
    mEl.className = "tree-card";
    mEl.innerHTML = cardHTML(c);
    mobileWrap.appendChild(mEl);
  }
});

const cardEls = desktopWrap ? Array.from(desktopWrap.children) : [];

/* ============================================================
   NEURON CENTERPIECE — canvas
   A glowing soma with dendrites + a descending axon. Action
   potentials flow along the fibres. Bacteriophages and glass
   shards drift in the depth. Cards orbit on a scroll-locked ring.
   ============================================================ */
(function initNeuron() {
  const canvas = document.getElementById("treeCanvas");
  const section = document.querySelector(".tree");
  const intro = document.getElementById("treeIntro");
  if (!canvas || !section) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return; // CSS swaps to the static fallback

  // Phones run the same helix, but lighter: fewer particles, capped DPR,
  // gentler geometry so cards stay on a narrow screen.
  const IS_MOBILE = window.matchMedia("(max-width: 700px)").matches;
  const QTY = IS_MOBILE ? 0.45 : 1;            // population multiplier

  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;

  // Deterministic pseudo-random so the scene is identical every load
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  /* ---------- geometry ----------
     The neuron is stretched into a tall trunk. The cards' branches
     sprout in a helix down the axon — a screw thread: each branch
     72° further round and one step lower than the last.            */
  const N_CARDS = cardEls.length;
  const STEP = 150;                 // vertical world-distance between thread turns
  const DTHETA = (Math.PI * 2) / 5; // 72° per card → 5 cards per revolution
  const HELIX_R = IS_MOBILE ? 165 : 250;  // gentler swing keeps cards on a narrow screen
  const dendrites = [];   // each: array of {x,y,z}
  const twiglets = [];    // small dendrite branchlets
  let axon = [];          // long descending fibre (the trunk of the descent)
  const axonTerminals = [];
  const helix = [];       // per card: { pts (branch), tip, theta, y }
  const soma = { x: 0, y: 0, z: 0, r: 46 };

  function buildBranch(origin, dir, length, segs, curl, droop) {
    // dir = {ax: azimuth, el: elevation}; returns a point list
    const pts = [];
    for (let j = 0; j <= segs; j++) {
      const t = j / segs;
      const out = length * Math.pow(t, 0.9);
      const wob = Math.sin(t * Math.PI * 1.3 + curl) * 26;
      pts.push({
        x: origin.x + Math.cos(dir.ax) * out * Math.cos(dir.el) + Math.cos(dir.ax + 1.6) * wob * t,
        y: origin.y + Math.sin(dir.el) * out + droop * Math.pow(t, 1.6) + Math.sin(curl + t * 4) * 6,
        z: origin.z + Math.sin(dir.ax) * out * Math.cos(dir.el) + Math.sin(dir.ax + 1.6) * wob * t,
      });
    }
    return pts;
  }

  function buildNeuron() {
    dendrites.length = 0; twiglets.length = 0; axonTerminals.length = 0;
    // Dendrites: radiate up & out from the soma
    const N_DEND = 8;
    for (let i = 0; i < N_DEND; i++) {
      const ax = i * 2.39996 + rand() * 0.4;          // golden-angle spread
      const el = 0.25 + rand() * 0.95;                // mostly upward
      const len = 210 + rand() * 120;
      const pts = buildBranch(soma, { ax, el }, len, 40, rand() * 6, -30 - rand() * 20);
      dendrites.push(pts);
      // branchlets near the tip
      const nTw = 2 + Math.floor(rand() * 2);
      for (let k = 0; k < nTw; k++) {
        const base = pts[Math.round(pts.length * (0.6 + k * 0.13))];
        const tax = ax + (rand() - 0.5) * 2.2;
        const tel = el + (rand() - 0.5) * 0.8;
        twiglets.push(buildBranch(base, { ax: tax, el: tel }, 60 + rand() * 60, 16, rand() * 6, -10));
      }
    }
    // Axon: the tall trunk — runs the full descent past every thread turn
    axon = [];
    const A_PTS = 160;
    const axonLen = (N_CARDS + 1.5) * STEP;           // covers all cards + tail
    for (let j = 0; j <= A_PTS; j++) {
      const t = j / A_PTS;
      axon.push({
        x: soma.x + Math.sin(t * Math.PI * 5.2) * 30 * Math.sin(t * Math.PI * 0.9),
        y: soma.y - (40 + t * axonLen),               // downward
        z: soma.z + Math.cos(t * Math.PI * 4.1) * 22 * Math.sin(t * Math.PI * 0.9),
      });
    }
    // Axon terminal arbor at the bottom
    const tip = axon[axon.length - 1];
    for (let i = 0; i < 6; i++) {
      const ax = i * 1.05 + rand();
      axonTerminals.push(buildBranch(tip, { ax, el: -0.6 - rand() * 0.7 }, 70 + rand() * 60, 16, rand() * 6, -24));
    }
    // Helix branches — the screw thread the cards ride
    helix.length = 0;
    for (let i = 0; i < N_CARDS; i++) {
      const theta = i * DTHETA;
      const yAtt = -(i + 1) * STEP;                   // attach height on the trunk
      // trunk point nearest the attach height
      const base = axon[Math.min(A_PTS, Math.max(0, Math.round(((-yAtt - 40) / axonLen) * A_PTS)))];
      // tip sits on the thread ring (so it faces the camera when rotated to front)
      const tipPt = { x: -HELIX_R * Math.sin(theta), y: yAtt, z: -HELIX_R * Math.cos(theta) };
      const pts = [];
      const B_PTS = 22;
      const wig = rand() * 6;
      for (let j = 0; j <= B_PTS; j++) {
        const t = j / B_PTS;
        const e = Math.pow(t, 1.08);
        pts.push({
          x: base.x + (tipPt.x - base.x) * e + Math.sin(wig + t * 5) * 9 * Math.sin(t * Math.PI),
          y: base.y + (tipPt.y - base.y + 42) * e - 42 * Math.pow(t, 2.1) - 26 * Math.sin(t * Math.PI),
          z: base.z + (tipPt.z - base.z) * e + Math.cos(wig + t * 4) * 9 * Math.sin(t * Math.PI),
        });
      }
      helix.push({ pts, tip: tipPt, theta, y: yAtt });
    }
  }
  buildNeuron();

  const fibres = [...dendrites, ...twiglets, axon, ...axonTerminals, ...helix.map(h => h.pts)];

  /* ---------- bacteriophages (decorative) ---------- */
  const PHAGES = [];
  for (let i = 0; i < Math.round(4 * QTY); i++) {
    const z = 380 + rand() * 720;          // deep background
    PHAGES.push({
      x: (rand() - 0.5) * 1100,
      y: (rand() - 0.5) * 900,
      z,
      scale: 0.45 + rand() * 0.5,
      spin: rand() * Math.PI,
      spinV: (rand() - 0.5) * 0.0035,
      driftY: 0.05 + rand() * 0.08,
      alpha: 0.34 + (1 - z / 1100) * 0.3,  // nearer = a touch brighter
    });
  }

  /* ---------- floating background neurons (atmosphere) ---------- */
  const BG_NEURONS = [];
  for (let i = 0; i < Math.round(6 * QTY); i++) {
    const nd = 5 + Math.floor(rand() * 2);          // dendrite count
    const arms = [];
    for (let k = 0; k < nd; k++) {
      arms.push({ ang: (k / nd) * Math.PI * 2 + rand() * 0.6, len: 0.7 + rand() * 0.8 });
    }
    const z = 520 + rand() * 760;                   // further than phages
    BG_NEURONS.push({
      x: (rand() - 0.5) * 1400,
      y: (rand() - 0.5) * 1100,
      z,
      scale: 0.5 + rand() * 0.8,
      spin: rand() * Math.PI * 2,
      spinV: (rand() - 0.5) * 0.0018,
      driftY: 0.03 + rand() * 0.06,
      arms,
      alpha: 0.10 + (1 - z / 1280) * 0.12,          // very subtle
    });
  }

  /* ---------- glass shards (Smash Hit feel) ---------- */
  const SHARDS = [];
  for (let i = 0; i < Math.round(13 * QTY); i++) {
    const verts = [];
    const n = 3 + Math.floor(rand() * 3);
    const rr = 16 + rand() * 30;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.6;
      const r = rr * (0.6 + rand() * 0.6);
      verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    SHARDS.push({
      x: (rand() - 0.5) * 1200,
      y: (rand() - 0.5) * 1000,
      z: 120 + rand() * 760,
      verts,
      spin: rand() * Math.PI * 2,
      spinV: (rand() - 0.5) * 0.01,
      driftY: 0.04 + rand() * 0.1,
      sparkle: rand() * Math.PI * 2,
    });
  }

  /* ---------- glow sprites (avoid per-frame gradient allocation) ---------- */
  function makeGlow(rgb) {
    const s = 64;
    const off = document.createElement("canvas");
    off.width = off.height = s;
    const octx = off.getContext("2d");
    const g = octx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, `rgba(${rgb},0.9)`);
    g.addColorStop(0.4, `rgba(${rgb},0.25)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    octx.fillStyle = g;
    octx.fillRect(0, 0, s, s);
    return off;
  }
  const GLOW_BLUE = makeGlow("180,230,255");
  const GLOW_PINK = makeGlow("232,83,127");

  /* ---------- particles (action potentials) ---------- */
  const PARTICLES = [];
  for (let i = 0; i < Math.round(150 * QTY); i++) {
    const onAxon = rand() < 0.4;
    PARTICLES.push({
      path: onAxon ? axon : fibres[Math.floor(rand() * fibres.length)],
      t: rand(),
      // dendrites carry signal inward (toward soma → reverse); axon outward (down)
      dir: onAxon ? 1 : -1,
      speed: 0.0016 + rand() * 0.003,
      size: 1 + rand() * 2.2,
      pink: rand() < 0.12,
    });
  }

  /* ---------- camera / projection ---------- */
  let scrollP = 0;
  let idle = 0;
  const FOCAL = 780;

  function project(p, camY, rot) {
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const x = p.x * cos - p.z * sin;
    const z = p.x * sin + p.z * cos;
    const scale = FOCAL / (FOCAL + z + 460);
    return { x: W / 2 + x * scale, y: H / 2 - (p.y - camY) * scale, scale, z };
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.6 : 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  function readScroll() {
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    scrollP = Math.min(1, Math.max(0, -rect.top / total));
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  /* ---------- drawing helpers ---------- */
  function strokePath(pts, camY, rot, width, color, growT) {
    const n = Math.max(2, Math.floor(pts.length * growT));
    ctx.beginPath();
    let prevScale = 1;
    for (let i = 0; i < n; i++) {
      const pr = project(pts[i], camY, rot);
      if (i === 0) ctx.moveTo(pr.x, pr.y);
      else ctx.lineTo(pr.x, pr.y);
      prevScale = pr.scale;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width * prevScale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function drawBgNeuron(nu, camY, rot) {
    const pr = project(nu, camY, rot);
    if (pr.scale <= 0) return;
    const s = pr.scale * nu.scale * 30;
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.rotate(nu.spin);
    ctx.lineCap = "round";
    // dendrite arms with a little branchlet
    ctx.strokeStyle = `rgba(150,205,240,${nu.alpha.toFixed(3)})`;
    ctx.lineWidth = 0.9 * pr.scale;
    nu.arms.forEach((arm) => {
      const ex = Math.cos(arm.ang) * s * arm.len;
      const ey = Math.sin(arm.ang) * s * arm.len;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(ex * 0.5 - ey * 0.12, ey * 0.5 + ex * 0.12, ex, ey);
      ctx.stroke();
      // small fork at the tip
      const fa = arm.ang + 0.5;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(fa) * s * 0.22, ey + Math.sin(fa) * s * 0.22);
      ctx.stroke();
    });
    // soma
    const R = s * 0.5;
    ctx.globalAlpha = nu.alpha * 2.4;
    ctx.drawImage(GLOW_BLUE, -R, -R, R * 2, R * 2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPhage(ph, camY, rot) {
    const pr = project(ph, camY, rot);
    if (pr.scale <= 0) return;
    const s = pr.scale * ph.scale * 20;          // smaller, subtler than before
    const a = ph.alpha != null ? ph.alpha : 0.5; // per-phage depth alpha
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.rotate(ph.spin);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rim = (o) => `rgba(168,222,255,${(o * a).toFixed(3)})`;
    const hY = -s * 1.5;                           // head centre
    const rH = s * 0.92;                           // capsid radius
    const hexPt = (i, r, cy) => {
      const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
      return [Math.cos(ang) * r, Math.sin(ang) * r + cy];
    };

    // soft translucent capsid fill (faceted gem)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const [x, y] = hexPt(i, rH, hY); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
    const cg = ctx.createLinearGradient(-rH, hY - rH, rH, hY + rH);
    cg.addColorStop(0, `rgba(205,240,255,${(0.14 * a).toFixed(3)})`);
    cg.addColorStop(1, `rgba(90,160,210,${(0.04 * a).toFixed(3)})`);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = rim(0.5);
    ctx.lineWidth = 1.1 * pr.scale;
    ctx.stroke();

    // three facet lines (3D read) — vertex to opposite vertex through centre
    ctx.strokeStyle = rim(0.28);
    ctx.lineWidth = 0.7 * pr.scale;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const [x1, y1] = hexPt(i, rH, hY);
      const [x2, y2] = hexPt(i + 3, rH, hY);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // collar + slender tail sheath with rings
    const tailTop = hY + rH * 0.95, tailBot = s * 1.25;
    ctx.strokeStyle = rim(0.42);
    ctx.lineWidth = 1.2 * pr.scale;
    ctx.beginPath();
    ctx.moveTo(0, tailTop); ctx.lineTo(0, tailBot);
    ctx.stroke();
    ctx.lineWidth = 0.7 * pr.scale;
    ctx.strokeStyle = rim(0.3);
    for (let k = 1; k <= 4; k++) {
      const ry = tailTop + (tailBot - tailTop) * (k / 5);
      ctx.beginPath();
      ctx.moveTo(-s * 0.16, ry); ctx.lineTo(s * 0.16, ry);
      ctx.stroke();
    }

    // small hexagonal baseplate
    ctx.strokeStyle = rim(0.4);
    ctx.lineWidth = 0.9 * pr.scale;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const [x, y] = hexPt(i, s * 0.34, tailBot); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
    ctx.stroke();

    // six gracefully curved legs, symmetric
    ctx.lineWidth = 0.9 * pr.scale;
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const tier = i % 3;                           // 0,1,2 spread
      const sx = side * s * 0.3;
      const outX = side * s * (0.9 + tier * 0.45);
      const kneeY = tailBot + s * 0.5;
      const footY = tailBot + s * (1.15 - tier * 0.12);
      ctx.strokeStyle = rim(0.34 - tier * 0.05);
      ctx.beginPath();
      ctx.moveTo(sx, tailBot);
      ctx.quadraticCurveTo(side * s * 0.55, kneeY, outX, footY);
      ctx.stroke();
    }

    // faint head glow (local space, centred on the capsid)
    const gR = rH * 1.7;
    ctx.globalAlpha = 0.32 * a;
    ctx.drawImage(GLOW_BLUE, -gR, hY - gR, gR * 2, gR * 2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawShard(sh, camY, rot) {
    const pr = project(sh, camY, rot);
    if (pr.scale <= 0) return;
    const s = pr.scale * 1.1;
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.rotate(sh.spin);
    ctx.scale(s, s);
    ctx.beginPath();
    sh.verts.forEach((v, i) => { i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y); });
    ctx.closePath();
    const g = ctx.createLinearGradient(-20, -20, 20, 20);
    g.addColorStop(0, "rgba(190,235,255,0.10)");
    g.addColorStop(0.5, "rgba(120,190,235,0.04)");
    g.addColorStop(1, "rgba(210,245,255,0.12)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(205,240,255,0.34)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // specular glint
    const sp = (Math.sin(sh.sparkle) + 1) / 2;
    if (sp > 0.6) {
      ctx.beginPath();
      ctx.arc(sh.verts[0].x, sh.verts[0].y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(sp - 0.6) * 1.6})`;
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- main loop ----------
     The screw-thread descent: scroll drives both the camera's drop
     down the trunk and the world's rotation, locked so card i's
     branch is rotated to the front exactly when the camera reaches
     its height. Upcoming cards wind up from below; passed cards
     corkscrew away overhead.                                       */
  const DESCENT = N_CARDS + 0.2;           // frontIdx range: -0.6 → N-0.4
  function draw(now) {
    try {
    idle = now * 0.001;
    const frontIdx = scrollP * DESCENT - 0.6;          // which card faces you
    const sway = Math.sin(idle * 0.35) * 0.045;        // gentle idle sway
    const rot = frontIdx * DTHETA + sway;              // thread rotation (scroll-locked)
    const camY = -(frontIdx + 1) * STEP;               // camera height on the trunk

    ctx.clearRect(0, 0, W, H);

    // ground glow
    const fog = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, W * 0.6);
    fog.addColorStop(0, "rgba(43,143,196,0.12)");
    fog.addColorStop(1, "rgba(43,143,196,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";

    // depth backdrop (drifts with the camera so it never gets left behind)
    BG_NEURONS.forEach((nu) => {
      nu.spin += nu.spinV;
      nu.y += nu.driftY;
      if (nu.y > 700) nu.y = -700;
      drawBgNeuron({ x: nu.x, y: camY + nu.y, z: nu.z, scale: nu.scale, spin: nu.spin, arms: nu.arms, alpha: nu.alpha }, camY, rot * 0.22);
    });
    PHAGES.forEach((ph) => {
      ph.spin += ph.spinV;
      ph.y += ph.driftY;
      if (ph.y > 600) ph.y = -600;
      drawPhage({ x: ph.x, y: camY + ph.y, z: ph.z, scale: ph.scale, spin: ph.spin, alpha: ph.alpha }, camY, rot * 0.3);
    });
    SHARDS.forEach((sh) => {
      sh.spin += sh.spinV;
      sh.sparkle += 0.05;
      sh.y += sh.driftY;
      if (sh.y > 620) sh.y = -620;
      drawShard({ ...sh, y: camY + sh.y }, camY, rot * 0.3);
    });

    // soma
    const sp = project(soma, camY, rot);
    const pulse = 0.85 + Math.sin(idle * 1.6) * 0.15;
    const sr = soma.r * sp.scale * pulse;
    const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sr * 2.4);
    sg.addColorStop(0, "rgba(225,245,255,0.9)");
    sg.addColorStop(0.3, "rgba(127,196,232,0.5)");
    sg.addColorStop(1, "rgba(43,143,196,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sr * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // dendrites + twiglets (layered glow)
    const drawFibre = (pts, w1, w2, w3) => {
      strokePath(pts, camY, rot, w1, "rgba(43,143,196,0.09)", 1);
      strokePath(pts, camY, rot, w2, "rgba(127,196,232,0.22)", 1);
      strokePath(pts, camY, rot, w3, "rgba(220,243,255,0.6)", 1);
    };
    dendrites.forEach((d) => drawFibre(d, 8, 3.6, 1.5));
    twiglets.forEach((t) => strokePath(t, camY, rot, 1.1, "rgba(185,228,250,0.42)", 1));

    // axon (slightly brighter trunk) + terminals
    drawFibre(axon, 11, 5, 2.1);
    axonTerminals.forEach((t) => strokePath(t, camY, rot, 1.3, "rgba(185,228,250,0.5)", 1));

    // helix branches — the screw thread; brighter as their card nears front
    helix.forEach((h, i) => {
      const u = frontIdx - i;                   // 0 = this branch faces you
      const near = Math.max(0, 1 - Math.abs(u) / 3);
      strokePath(h.pts, camY, rot, 7, `rgba(43,143,196,${(0.05 + near * 0.09).toFixed(3)})`, 1);
      strokePath(h.pts, camY, rot, 3, `rgba(127,196,232,${(0.10 + near * 0.20).toFixed(3)})`, 1);
      strokePath(h.pts, camY, rot, 1.3, `rgba(220,243,255,${(0.18 + near * 0.45).toFixed(3)})`, 1);
      // glowing bud at the branch tip
      const tp = project(h.tip, camY, rot);
      const R = (3 + near * 7) * tp.scale * 3;
      ctx.drawImage(GLOW_BLUE, tp.x - R, tp.y - R, R * 2, R * 2);
    });

    // particles
    PARTICLES.forEach((pt) => {
      pt.t += pt.speed;
      if (pt.t > 1) pt.t = 0;
      const u = pt.dir > 0 ? pt.t : 1 - pt.t;
      const idx = Math.min(pt.path.length - 1, Math.floor(u * (pt.path.length - 1)));
      const pr = project(pt.path[idx], camY, rot);
      if (pr.y < -40 || pr.y > H + 40) return;
      const R = pt.size * pr.scale * 7.2;          // glow radius
      const sprite = pt.pink ? GLOW_PINK : GLOW_BLUE;
      ctx.drawImage(sprite, pr.x - R, pr.y - R, R * 2, R * 2);
    });

    ctx.globalCompositeOperation = "source-over";

    /* ---------- cards on the screw thread ----------
       Each card rides its branch tip. It winds up from below, sweeps
       around the trunk, locks face-on at eye level, then corkscrews
       away overhead. 2–3 upcoming panels stay visible on the thread. */
    cardEls.forEach((el, i) => {
      const u = frontIdx - i;                   // <0 below you (upcoming), 0 facing you, >0 passed
      if (Math.abs(u) > 3.1) {                  // beyond the visible stretch of thread
        el.style.visibility = "hidden";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }
      el.style.visibility = "visible";
      const h = helix[i];
      const pr = project(h.tip, camY, rot);     // true 3D spot on the thread
      const dx = pr.x - W / 2;
      const dy = pr.y - H / 2;
      // screen angle around the trunk: 0 = front
      let s = Math.atan2(Math.sin(h.theta - rot), Math.cos(h.theta - rot));
      const frontness = (Math.cos(s) + 1) / 2;  // 1 front, 0 behind the trunk
      const reach = Math.max(0, 1 - Math.abs(u) / 3.1);
      const opacity = reach * (0.14 + 0.86 * Math.pow(frontness, 2.6));
      let scale = pr.scale * (0.78 + Math.pow(frontness, 2) * 0.62);
      if (IS_MOBILE) scale = Math.min(scale, 1.02);   // keep cards within a narrow screen
      const rotY = Math.max(-38, Math.min(38, -s * 32));
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(100 + Math.round((1 - pr.z / (HELIX_R * 2)) * 60));
      el.style.transform =
        `translate(-50%, -50%) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) ` +
        `scale(${scale.toFixed(3)}) perspective(1000px) rotateY(${rotY.toFixed(1)}deg)`;
      el.style.pointerEvents = Math.abs(u) < 0.35 ? "auto" : "none";
    });

    // intro fades as the descent begins
    if (intro) {
      const introVis = Math.max(0, 1 - scrollP / 0.04);
      intro.style.opacity = introVis.toFixed(3);
    }

    } catch (err) {
      /* one bad frame shouldn't kill the loop */
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ============================================================
   CONTACT FORM — Formspree if configured, mailto fallback
   ============================================================ */
(function initForm() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.classList.remove("is-error");

    const data = new FormData(form);
    const name = (data.get("name") || "").toString().trim();
    const email = (data.get("email") || "").toString().trim();
    const service = (data.get("service") || "").toString();
    const message = (data.get("message") || "").toString().trim();

    if (!name || !email || !service || !message) {
      status.textContent = "Please fill in every field.";
      status.classList.add("is-error");
      return;
    }

    if (CONFIG.formspreeId) {
      status.textContent = "Sending…";
      try {
        const res = await fetch(`https://formspree.io/f/${CONFIG.formspreeId}`, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
        });
        if (!res.ok) throw new Error("send failed");
        form.reset();
        status.textContent = "Thank you! Sanette will be in touch within 24 hours.";
      } catch {
        status.textContent = "Something went wrong — please email sanette@sensoriumtherapy.com directly.";
        status.classList.add("is-error");
      }
    } else {
      const subject = encodeURIComponent(`Website inquiry — ${service}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nInterested in: ${service}\n\n${message}`);
      window.location.href = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
      status.textContent = "Your email app should open — just press send. Sanette will be in touch within 24 hours.";
    }
  });
})();

/* ---------------- misc ---------------- */
document.getElementById("year").textContent = new Date().getFullYear();
