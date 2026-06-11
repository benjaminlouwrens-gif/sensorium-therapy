/* ============================================================
   Sensorium Therapy — interactions
   1. Energy tree: scroll-driven 3D canvas (rotates + descends)
   2. Glass cards revealed along the descent
   3. Contact form (Formspree w/ mailto fallback)
   4. Call button (tel: on touch devices, clipboard on desktop)
   ============================================================ */

/* ----------------------- CONFIG ----------------------- */
const CONFIG = {
  email: "sanette@sensoriumtherapy.com",
  // TODO: replace with Sanette's real number, e.g. "+19165551234"
  phone: "",
  phoneDisplay: "",
  // TODO: create a free form at https://formspree.io (sign in with
  // sanette@sensoriumtherapy.com) and paste the form ID here, e.g. "mqkrgwyz".
  // Until then the form falls back to opening the visitor's mail app.
  formspreeId: "",
};

/* ----------------------- CARD DATA -----------------------
   Ten branches, ordered canopy → roots: the descent moves from
   expression down to the foundation of relational safety.       */
const CARDS = [
  {
    tag: "ot", tagLabel: "OT · For Children", title: "Symbolic Capacity",
    body: "At the canopy: imagination, language, and play. When the nervous system feels organized, children can represent feelings with ideas instead of behaviors — the highest branch of development.",
  },
  {
    tag: "relia", tagLabel: "RELIA · A", title: "Attunement & Integration",
    body: "We weave new patterns into daily life — at home, school, work, and in relationships — so regulation becomes who you are, not something you perform.",
    quote: "Lasting change in how the nervous system reads the world, responds to stress, and experiences self and others.",
  },
  {
    tag: "relia", tagLabel: "RELIA · I", title: "Identity",
    body: "We honor who you are, not just what you do — rewriting stories like “I'm too much” or “I can't cope” in a compassionate, neurobiologically accurate way.",
  },
  {
    tag: "ot", tagLabel: "OT · For Children", title: "Emotional Regulation",
    body: "Big feelings need a body that can hold them. We build the capacity to ride waves of emotion — up into excitement, down into calm — without tipping into overwhelm.",
  },
  {
    tag: "relia", tagLabel: "RELIA · L", title: "Listening",
    body: "We slow down enough to hear the body inside — tension, breath, gut feelings — and relationships outside: tone, pacing, cues.",
    quote: "Instead of drowning in sensations and emotions, you start to understand them and respond more flexibly.",
  },
  {
    tag: "shared", tagLabel: "Tomatis® · Both Pathways", title: "Neuro-Auditory Listening",
    body: "Carefully filtered music delivered through the ears and the bones of the head gently retunes the ear–brain connection — organizing sound, balance, and inner body cues.",
  },
  {
    tag: "ot", tagLabel: "OT · For Children", title: "Sensory Integration",
    body: "Touch, movement, sound, and gravity must become one coherent picture. Through play-based sensory work, scattered input starts to make sense — and the world feels less overwhelming.",
  },
  {
    tag: "relia", tagLabel: "RELIA · E", title: "Embodied",
    body: "We work through the body, not just the head — movement, posture, breath, and play create new regulated states, strengthening interoception: the felt sense of what's happening inside.",
  },
  {
    tag: "ot", tagLabel: "OT · For Children", title: "Relational Safety",
    body: "Near the roots: co-regulation. A child borrows calm from a safe adult long before they can make their own. Attachment-informed care makes every other branch possible.",
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

CARDS.forEach((c, i) => {
  const el = document.createElement("article");
  el.className = `tree-card tree-card--${i % 2 === 0 ? "left" : "right"}`;
  el.innerHTML = cardHTML(c);
  desktopWrap.appendChild(el);

  const mEl = document.createElement("article");
  mEl.className = "tree-card";
  mEl.innerHTML = cardHTML(c);
  mobileWrap.appendChild(mEl);
});

const cardEls = Array.from(desktopWrap.children);

/* ============================================================
   ENERGY TREE — canvas
   A 3D tree of glowing branch curves. Scroll progress drives the
   camera's descent from canopy to roots and the slow rotation;
   particles flow along every branch continuously.
   ============================================================ */
(function initTree() {
  const canvas = document.getElementById("treeCanvas");
  const section = document.querySelector(".tree");
  const intro = document.getElementById("treeIntro");
  if (!canvas || !section) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return; // CSS already swaps to the static fallback

  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;

  /* ---------- geometry ---------- */
  const TREE_H = 1000;            // world height of the tree
  const N_BRANCHES = CARDS.length;
  const branches = [];            // each: array of {x,y,z} points
  let trunk = [];

  // Deterministic pseudo-random so the tree is identical every load
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  function buildTree() {
    // Trunk: gentle S-curve up the Y axis
    trunk = [];
    const T_PTS = 80;
    for (let i = 0; i <= T_PTS; i++) {
      const t = i / T_PTS;
      trunk.push({
        x: Math.sin(t * Math.PI * 2.2) * 26 * Math.sin(t * Math.PI),
        y: t * TREE_H,
        z: Math.cos(t * Math.PI * 1.7) * 18 * Math.sin(t * Math.PI),
      });
    }

    // Branches: card i lives at descending heights (canopy → roots)
    for (let i = 0; i < N_BRANCHES; i++) {
      const hFrac = 0.92 - (i / (N_BRANCHES - 1)) * 0.78; // 0.92 → 0.14
      const baseY = hFrac * TREE_H;
      const azimuth = i * 2.39996 + rand() * 0.5; // golden-angle spread
      const len = 200 + rand() * 90 + (1 - hFrac) * 60;
      const lift = 90 + rand() * 80;
      const pts = [];
      const B_PTS = 46;
      // find trunk point at baseY for the branch origin
      const tp = trunk[Math.round(hFrac * (trunk.length - 1))];
      for (let j = 0; j <= B_PTS; j++) {
        const t = j / B_PTS;
        const out = len * Math.pow(t, 0.85);
        const curl = Math.sin(t * Math.PI * 1.1) * 30;
        pts.push({
          x: tp.x + Math.cos(azimuth) * out + Math.cos(azimuth + 1.7) * curl * t,
          y: baseY + lift * Math.pow(t, 1.4) - 14 * t,
          z: tp.z + Math.sin(azimuth) * out + Math.sin(azimuth + 1.7) * curl * t,
        });
      }
      // small twigs off the branch tip
      const twigs = [];
      for (let k = 0; k < 3; k++) {
        const start = pts[Math.round(B_PTS * (0.55 + k * 0.15))];
        const ta = azimuth + (rand() - 0.5) * 2.4;
        const tl = 40 + rand() * 50;
        const tw = [];
        for (let j = 0; j <= 14; j++) {
          const t = j / 14;
          tw.push({
            x: start.x + Math.cos(ta) * tl * t,
            y: start.y + (30 + rand() * 20) * t,
            z: start.z + Math.sin(ta) * tl * t,
          });
        }
        twigs.push(tw);
      }
      branches.push({ pts, twigs, hFrac });
    }
  }
  buildTree();

  /* ---------- particles ---------- */
  const PARTICLES = [];
  const N_PARTICLES = 150;
  const allPaths = [trunk, ...branches.map(b => b.pts)];
  for (let i = 0; i < N_PARTICLES; i++) {
    PARTICLES.push({
      path: allPaths[Math.floor(rand() * allPaths.length)],
      t: rand(),
      speed: 0.0012 + rand() * 0.0025,
      size: 1 + rand() * 2.2,
      pink: rand() < 0.12, // occasional pink spark (logo heart accent)
    });
  }

  /* ---------- camera / projection ---------- */
  let scrollP = 0;      // 0..1 through the section
  let rotation = 0;     // current rotation (rad)
  let idle = 0;         // idle drift time

  const FOCAL = 760;

  function project(p, camY, rot) {
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const x = p.x * cos - p.z * sin;
    const z = p.x * sin + p.z * cos;
    const scale = FOCAL / (FOCAL + z + 420);
    return {
      x: W / 2 + x * scale,
      y: H / 2 - (p.y - camY) * scale,
      scale,
      z,
    };
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- scroll tracking ---------- */
  function readScroll() {
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    scrollP = Math.min(1, Math.max(0, -rect.top / total));
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  /* ---------- drawing ---------- */
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
    ctx.stroke();
  }

  // Branch i reveals while the camera passes its height window
  function branchReveal(i) {
    const center = (i + 1) / (N_BRANCHES + 1);
    const d = (scrollP - (center - 0.09)) / 0.07;
    return Math.min(1, Math.max(0, d));
  }

  function draw(now) {
    idle = now * 0.001;
    rotation = idle * 0.07 + scrollP * Math.PI * 3; // slow idle + 1.5 turns over descent

    // Camera descends the tree: canopy (high) → roots (low)
    const camY = TREE_H * (0.88 - scrollP * 0.82);

    ctx.clearRect(0, 0, W, H);

    // faint ground-fog glow near the bottom of the viewport
    const fog = ctx.createRadialGradient(W / 2, H * 0.95, 0, W / 2, H * 0.95, W * 0.55);
    fog.addColorStop(0, "rgba(43,143,196,0.10)");
    fog.addColorStop(1, "rgba(43,143,196,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";

    // trunk: layered strokes = soft glow
    strokePath(trunk, camY, rotation, 13, "rgba(43,143,196,0.10)", 1);
    strokePath(trunk, camY, rotation, 6, "rgba(127,196,232,0.22)", 1);
    strokePath(trunk, camY, rotation, 2.2, "rgba(220,243,255,0.65)", 1);

    // branches grow in as their card approaches
    branches.forEach((b, i) => {
      const g = 0.25 + branchReveal(i) * 0.75; // partially visible even before reveal
      strokePath(b.pts, camY, rotation, 8, "rgba(43,143,196,0.08)", g);
      strokePath(b.pts, camY, rotation, 3.5, "rgba(127,196,232,0.20)", g);
      strokePath(b.pts, camY, rotation, 1.4, "rgba(220,243,255,0.55)", g);
      if (g > 0.85) {
        b.twigs.forEach(tw => {
          strokePath(tw, camY, rotation, 1, "rgba(180,225,250,0.4)", (g - 0.85) / 0.15);
        });
      }
    });

    // particles
    PARTICLES.forEach(pt => {
      pt.t += pt.speed;
      if (pt.t > 1) pt.t = 0;
      const idx = Math.min(pt.path.length - 1, Math.floor(pt.t * (pt.path.length - 1)));
      const pr = project(pt.path[idx], camY, rotation);
      if (pr.y < -40 || pr.y > H + 40) return;
      const r = pt.size * pr.scale * 2.4;
      const grad = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 3);
      const core = pt.pink ? "rgba(232,83,127," : "rgba(180,230,255,";
      grad.addColorStop(0, core + "0.9)");
      grad.addColorStop(0.4, core + "0.25)");
      grad.addColorStop(1, core + "0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = "source-over";

    /* ---------- cards: fade in, drift up, rotate past ---------- */
    cardEls.forEach((el, i) => {
      const center = (i + 1) / (N_BRANCHES + 1);
      const halfWin = 0.045;
      const d = (scrollP - center) / halfWin; // -1..1 visible window
      const vis = Math.max(0, 1 - Math.abs(d) * Math.abs(d)); // smooth bell
      el.style.opacity = vis.toFixed(3);
      const drift = -d * 90; // moves up as you pass it
      const tilt = d * 14;   // gently rotates past you
      el.style.transform =
        `translateY(calc(-50% + ${drift.toFixed(1)}px)) perspective(900px) rotateY(${tilt.toFixed(1)}deg)`;
      el.style.pointerEvents = vis > 0.5 ? "auto" : "none";
    });

    // intro fades out as the descent begins
    if (intro) {
      const introVis = Math.max(0, 1 - scrollP / 0.05);
      intro.style.opacity = introVis.toFixed(3);
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
      // Free fallback: open the visitor's mail app pre-filled
      const subject = encodeURIComponent(`Website inquiry — ${service}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nInterested in: ${service}\n\n${message}`);
      window.location.href = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
      status.textContent = "Your email app should open — just press send. Sanette will be in touch within 24 hours.";
    }
  });
})();

/* ============================================================
   CALL BUTTON — tel: on touch devices, clipboard on desktop
   ============================================================ */
(function initCall() {
  const buttons = [document.getElementById("callBtnNav"), document.getElementById("callBtnMain")].filter(Boolean);
  if (!buttons.length) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  document.body.appendChild(toast);
  let toastTimer;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  const isTouch = matchMedia("(pointer: coarse)").matches;

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!CONFIG.phone) {
        // Phone not configured yet — fall back to email so the button still helps
        try {
          await navigator.clipboard.writeText(CONFIG.email);
          showToast("Email copied: " + CONFIG.email);
        } catch {
          window.location.href = "mailto:" + CONFIG.email;
        }
        return;
      }
      if (isTouch) {
        window.location.href = "tel:" + CONFIG.phone;
      } else {
        try {
          await navigator.clipboard.writeText(CONFIG.phoneDisplay || CONFIG.phone);
          showToast("Number copied: " + (CONFIG.phoneDisplay || CONFIG.phone));
        } catch {
          showToast((CONFIG.phoneDisplay || CONFIG.phone));
        }
      }
    });
  });
})();

/* ---------------- misc ---------------- */
document.getElementById("year").textContent = new Date().getFullYear();
