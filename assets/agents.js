/* MD-Avatar und Agenten-Szenen.
   Wird erst nach "load" nachgeladen (siehe Seitenende; das Hero-Bild bleibt LCP), lädt agents.css (Platz reserviert der kleine
   <style>-Block im HTML) und bewegt nur, was im Viewport liegt und bei sichtbarem Tab.
   Der Avatar wird einmal aus dem vorhandenen Bild in Ebenen zerlegt (Kopf, Körper, Hände; Canvas,
   damit kein neuer LCP-Kandidat entsteht), Augen und Mund liegen als eigene Elemente darüber.
   Ohne IntersectionObserver oder bei "Bewegung reduzieren" bleibt das statische Endbild stehen. */
(() => {
  const hero = document.querySelector('.hero-avatar');
  const scenes = [...document.querySelectorAll('[data-agx]')];
  const greeters = [...document.querySelectorAll('[data-greet]')];
  const steps = [...document.querySelectorAll('.hv-step')];
  if (!hero && !scenes.length && !greeters.length && !steps.length) return;

  const root = document.documentElement;
  const href = new URL('agents.css', document.currentScript.src).href;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  let styles;
  const loadStyles = () => {
    styles = styles || new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', resolve);
      link.addEventListener('error', reject);
      document.head.append(link);
    });
    return styles;
  };
  /* Ohne Stylesheet wäre die Szene Bruchwerk: ausblenden, nichts zerlegen */
  const unstyled = () => scenes.forEach((n) => { n.hidden = true; });

  const el = (cls, ...children) => {
    const node = document.createElement(cls === 'i' ? 'i' : 'span');
    if (cls !== 'i') node.className = cls;
    node.append(...children);
    return node;
  };

  /* ── Avatar-Geometrie in Bildpixeln, je Quelle (Schlüssel = natürliche Breite) ── */
  const GEO = {
    760: { /* roboter.webp, Hero */
      head: [[180, 140], [580, 140], [580, 408], [481, 416], [456, 421.5], [400, 426], [378, 428], [354, 429], [308, 429.5], [270, 416], [180, 400]],
      body: [[309, 640], [309, 490], [322, 468], [338, 446], [354, 429], [364, 421], [378, 418], [394, 420], [406, 428], [422, 442], [442, 472], [462, 510], [462, 640]],
      handL: [[234, 478], [308, 478], [308, 560], [234, 560]],
      handR: [[463, 460], [530, 460], [530, 541], [463, 541]],
      eyes: [[346, 301, 35, 58], [442, 297, 34, 56]],
      mouth: [393, 370, 37, 12],
      pad: 7,
    },
    200: { /* avatar-200.webp */
      head: [[0, 0], [200, 0], [200, 128], [160, 141], [142, 145.5], [112, 148], [100, 149.5], [87, 150], [75, 150.5], [62, 149.5], [45, 143], [0, 135]],
      body: [[62, 261], [62, 186], [72, 164], [79, 155], [87, 148], [94, 145], [101, 144.5], [108, 145.5], [113, 148], [122, 154], [131, 165], [145, 190], [145, 261]],
      handL: [[20, 173], [62, 173], [62, 224], [20, 224]],
      handR: [[146, 164], [185, 164], [185, 212], [146, 212]],
      eyes: [[82, 80, 20, 32], [134, 78, 19, 31]],
      mouth: [108, 117, 20, 7],
      pad: 3,
    },
  };

  const SCREEN = '#030305'; /* Bildschirmfarbe im Avatar-Foto, kein Design-Token */

  /* Ein Teil des Bildes als Canvas, in Prozent der Bildfläche platziert. "wipe" übermalt Augen/Mund. */
  function cut(img, W, H, poly, wipe, pad) {
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const x = Math.floor(Math.min(...xs));
    const y = Math.floor(Math.min(...ys));
    const w = Math.min(W, Math.ceil(Math.max(...xs))) - x;
    const h = Math.min(H, Math.ceil(Math.max(...ys))) - y;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    c.beginPath();
    poly.forEach(([px, py], i) => c[i ? 'lineTo' : 'moveTo'](px - x, py - y));
    c.clip();
    c.drawImage(img, -x, -y, W, H);
    if (wipe) {
      c.fillStyle = c.shadowColor = SCREEN;
      c.shadowBlur = pad;
      for (const [ex, ey, ew, eh] of wipe) {
        c.beginPath();
        if (c.roundRect) c.roundRect(ex - x - pad, ey - y - pad, ew + 2 * pad, eh + 2 * pad, pad * 2);
        else c.rect(ex - x - pad, ey - y - pad, ew + 2 * pad, eh + 2 * pad);
        c.fill();
        c.fill();
      }
    }
    Object.assign(canvas.style, {
      left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`,
      width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%`,
    });
    return canvas;
  }

  function place(node, [x, y, w, h], W, H) {
    Object.assign(node.style, {
      left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`,
      width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%`,
    });
    return node;
  }

  const loaded = (img) => new Promise((resolve) => {
    img.loading = 'eager';
    const done = () => (img.decode ? img.decode().then(resolve, resolve) : resolve());
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener('load', done, { once: true });
  });

  /* Baut die Ebenen über dem Bild. host bekommt .md-alive, das Originalbild wird unsichtbar. */
  async function rig(host, img) {
    await loaded(img);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const g = GEO[W];
    if (!g || !document.createElement('canvas').getContext) return null;

    let box = img.closest('.avatar-parallax'); /* Hero: Bild nie verschieben */
    if (!box) {
      box = el('md-wrap');
      img.before(box);
      box.append(img);
    }

    const [pxl, pxr] = g.eyes.map((e) => place(el('md-eye'), e, W, H));
    const joy = g.eyes.map(([x, y, w, h]) => place(el('md-joy'), [x - w * 0.15, y + h * 0.18, w * 1.3, h * 0.55], W, H));
    const mouth = place(el('md-mouth'), g.mouth, W, H);
    const gaze = el('md-l md-gaze', el('md-l md-eyes', pxl, pxr), el('md-l md-joys', ...joy), mouth);
    const gazeLook = el('md-l md-look-gaze', gaze);
    const head = el('md-l md-head-idle', cut(img, W, H, g.head, [...g.eyes, g.mouth], g.pad), gazeLook);
    const headLook = el('md-l md-look-head', el('md-l md-head-act', head));
    const hand = (side, poly) => el(`md-l md-hand md-hand-${side}`, el('md-l md-hand-act', el('md-l md-hand-idle', cut(img, W, H, poly))));
    const handL = hand('l', g.handL);
    const handR = hand('r', g.handR);
    /* Drehpunkte der Hände: ihre Mitte */
    [[handL, g.handL], [handR, g.handR]].forEach(([node, poly]) => {
      const origin = `${((poly[0][0] + poly[1][0]) / 2 / W) * 100}% ${((poly[0][1] + poly[2][1]) / 2 / H) * 100}%`;
      node.querySelectorAll('.md-hand-act, .md-hand-idle').forEach((n) => { n.style.transformOrigin = origin; });
    });
    headLook.querySelectorAll('.md-head-act, .md-head-idle').forEach((n) => {
      n.style.transformOrigin = `50% ${(g.head[6][1] / H) * 100}%`;
    });
    const body = el('md-l md-body', cut(img, W, H, g.body));
    const float = el('md-l md-float', body, headLook, handL, handR); /* Hände liegen vor dem Kopf */
    const tilt = el('md-l md-look-tilt', float);
    const node = el('md-rig', tilt);
    node.setAttribute('aria-hidden', 'true');

    /* Übergang ohne Sprung: dort beginnen, wo das Bild gerade schwebt */
    const style = getComputedStyle(img);
    const from = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
    const [tx = 0, ty = 0] = style.translate === 'none' ? [] : style.translate.split(' ').map(parseFloat);
    node.style.transform = `translate3d(${from.m41 + tx}px, ${from.m42 + ty}px, 0)`;
    box.append(node);
    host.classList.add('md-alive');
    node.getBoundingClientRect();
    node.style.transition = 'transform .9s cubic-bezier(0.77, 0, 0.175, 1)';
    node.style.transform = 'translate3d(0, 0, 0)';
    return { host, node, tilt, headLook, gazeLook };
  }

  /* ── Blick folgt dem Zeiger (nur feiner Zeiger): gedämpfte Feder, läuft nur bis zur Ruhe.
     Feste 60-Hz-Schritte, damit sie auf 120-Hz-Displays nicht doppelt so schnell läuft;
     zwischen zwei Schritten wird interpoliert. ── */
  const STEP = 1000 / 60;
  const lookers = [];
  let pointer = null;
  let ticking = false;
  let last = 0;
  let lag = 0;
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  function lookFrame(now) {
    ticking = false;
    if (reduce.matches || root.classList.contains('md-still') || document.hidden) { last = 0; return; }
    lag += last ? Math.min(now - last, 50) : STEP;
    last = now;
    const steps60 = Math.floor((lag + 0.5) / STEP);
    lag = Math.max(0, lag - steps60 * STEP);
    const blend = Math.min(1, lag / STEP);
    const active = lookers.filter((r) => !r.host.closest('.md-off'));
    const rects = active.map((r) => r.node.getBoundingClientRect());
    let moving = false;
    active.forEach((r, i) => {
      const b = rects[i];
      const goal = pointer
        ? [clamp((pointer[0] - b.left - b.width / 2) / (window.innerWidth * 0.35)), clamp((pointer[1] - b.top - b.height * 0.35) / (window.innerHeight * 0.45))]
        : [0, 0];
      for (let n = 0; n < steps60; n += 1) {
        for (let a = 0; a < 2; a += 1) {
          r.q[a] = r.p[a];
          r.v[a] = r.v[a] * 0.74 + (goal[a] - r.p[a]) * 0.06;
          r.p[a] += r.v[a];
        }
      }
      if ([0, 1].some((a) => Math.abs(r.v[a]) > 0.001 || Math.abs(goal[a] - r.p[a]) > 0.002)) moving = true;
      const [x, y] = [0, 1].map((a) => r.q[a] + (r.p[a] - r.q[a]) * blend);
      r.tilt.style.transform = `perspective(900px) translate3d(${(x * 2.4).toFixed(2)}%, ${(y * 1.4).toFixed(2)}%, 0) rotateX(${(y * -9).toFixed(2)}deg) rotateY(${(x * 16).toFixed(2)}deg)`;
      r.headLook.style.transform = `translate3d(${(x * 1.6).toFixed(2)}%, ${(y * 1.5).toFixed(2)}%, 0) rotate(${(x * 6).toFixed(2)}deg)`;
      r.gazeLook.style.transform = `translate3d(${(x * 2).toFixed(2)}%, ${(y * 1.7).toFixed(2)}%, 0)`;
    });
    if (moving) kick();
    else { last = 0; lag = 0; }
  }
  function kick() { if (!ticking) { ticking = true; requestAnimationFrame(lookFrame); } }
  const follow = (r) => lookers.push({ ...r, p: [0, 0], q: [0, 0], v: [0, 0] });

  /* ── Pause (WCAG 2.2.2): ein Zustand für die ganze Seite, jeder Knopf schaltet ihn.
     main.js liest html.md-still und hält dann auch den Hero-Parallax an. ── */
  const still = () => root.classList.contains('md-still');
  const toggles = [];
  const waiting = new Set(); /* Szenen, die erst nach "Weiter" loslaufen */
  const label = (button) => {
    button.textContent = still() ? 'Weiter' : 'Pause';
    button.setAttribute('aria-label', still() ? 'Weiter: Animationen fortsetzen' : 'Pause: Animationen anhalten');
  };
  function setStill(on, from) {
    root.classList.toggle('md-still', on);
    toggles.forEach(label);
    if (on) {
      /* Szenen außerhalb des Bildes zeigen das Endbild statt eines eingefrorenen Zwischenstands.
         Die Szene, deren eigener Knopf gedrückt wurde, bleibt immer im aktuellen Bild stehen. */
      document.querySelectorAll('.agx.is-armed.md-off').forEach((n) => {
        if (n.contains(from)) return;
        n.classList.remove('is-armed');
        waiting.add(n);
      });
      return;
    }
    waiting.forEach((n) => n.classList.add('is-armed'));
    waiting.clear();
    kick();
  }
  function addToggle(parent, extra) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = extra ? `md-toggle ${extra}` : 'md-toggle';
    button.addEventListener('click', () => setStill(!still(), button));
    label(button);
    toggles.push(button);
    parent.append(button);
  }

  /* Alle Knöpfe entstehen gemeinsam mit dem ersten Avatar: wer mitten auf der Seite einsteigt,
     findet die Pause schon vor. */
  let controls = false;
  function addControls() {
    if (controls) return;
    controls = true;
    if (hero) {
      /* Der Knopf liegt im Avatar-Feld: aria-hidden wandert vom Feld auf die Dekoration */
      [...hero.children].forEach((n) => n.setAttribute('aria-hidden', 'true'));
      hero.removeAttribute('aria-hidden');
      addToggle(hero, 'md-toggle--hero');
    }
    scenes.forEach((n) => addToggle(n.querySelector('.agx-top')));
  }

  /* ── Sichtbarkeit: außerhalb des Viewports und bei verstecktem Tab steht alles ── */
  let watcher;
  const watch = (node) => { node.classList.add('md-off'); watcher.observe(node); };

  const once = (node, threshold, fn) => {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      fn();
    }, { threshold });
    io.observe(node);
  };
  const near = (node, fn) => {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      loadStyles().then(() => { if (!reduce.matches) { addControls(); fn(); } }, unstyled);
    }, { rootMargin: '900px 0px' });
    io.observe(node);
  };

  /* Winken: beim ersten Sichtkontakt, danach bei Hover oder Tipp. Endet mit der Animation
     (nicht per Timer), damit die Pause auch ein laufendes Winken hält. */
  function wave(host) {
    if (still() || host.classList.contains('md-wave')) return;
    host.classList.add('md-wave');
  }
  function waveOnTouch(host, target = host) {
    host.addEventListener('animationend', (e) => { if (e.animationName === 'md-hop' && e.target.classList.contains('md-rig')) host.classList.remove('md-wave'); });
    target.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') wave(host); });
    target.addEventListener('pointerdown', () => wave(host));
  }

  /* Sprechblase tippt: der vorhandene Satz erscheint Zeichen für Zeichen, Platz ist reserviert */
  function splitBubble(bubble) {
    let i = 0;
    const words = bubble.dataset.t.split(' ').flatMap((word, n) => {
      const chars = [...word].map((ch) => {
        const s = el('md-ch', ch);
        s.style.transitionDelay = `${560 + (i += 1) * 24}ms`;
        return s;
      });
      i += 1;
      return n ? [' ', el('md-word', ...chars)] : [el('md-word', ...chars)];
    });
    bubble.style.setProperty('--typing', `${i * 24}ms`);
    bubble.append(...words, el('md-dots', el('i'), el('i'), el('i')));
    bubble.classList.add('is-split');
  }

  function setupHero() {
    const img = hero.querySelector('img');
    rig(hero, img).then((r) => {
      if (!r || reduce.matches) return;
      watch(hero);
      if (fine.matches) follow(r);
      waveOnTouch(hero, hero.querySelector('.avatar-parallax') || hero);
      setTimeout(() => wave(hero), 900);
    });
  }

  function setupGreeter(host) {
    const figure = host.querySelector('.md-figure');
    const bubble = host.querySelector('.md-say');
    if (bubble) splitBubble(bubble);
    rig(figure, figure.querySelector('img')).then((r) => {
      if (reduce.matches) return;
      watch(host);
      if (r && fine.matches) follow(r);
      waveOnTouch(host, bubble ? host : figure);
      once(host, 0.6, () => { host.classList.add('md-greet'); wave(host); });
    });
  }

  /* Szene: 14-s-Schleife mit Pause-Knopf */
  function setupScene(scene) {
    const figure = scene.querySelector('.agx-bot .md-figure');
    const stage = scene.querySelector('.agx-fig');
    rig(figure, figure.querySelector('img')).then(() => {
      if (reduce.matches) return;
      const token = el('agx-token', el('i'), el('i'), el('i'));
      token.setAttribute('aria-hidden', 'true');
      stage.append(token);
      watch(scene);
      if (still()) waiting.add(scene);
      else scene.classList.add('is-armed');
    });
  }

  function start() {
    if (reduce.matches) { /* nur Gestaltung laden, nichts bewegen */
      [...scenes, ...greeters, ...steps].forEach((n) => near(n, () => {}));
      return;
    }
    watcher = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle('md-off', !e.isIntersecting);
      kick();
    }, { threshold: 0.15 });
    document.addEventListener('visibilitychange', () => root.classList.toggle('md-hidden', document.hidden));
    root.classList.toggle('md-hidden', document.hidden);
    if (fine.matches) {
      window.addEventListener('pointermove', (e) => { pointer = [e.clientX, e.clientY]; kick(); }, { passive: true });
      root.addEventListener('pointerleave', () => { pointer = null; kick(); });
      window.addEventListener('scroll', kick, { passive: true });
    }
    if (hero) near(hero, setupHero);
    greeters.forEach((n) => near(n, () => setupGreeter(n)));
    scenes.forEach((n) => near(n, () => setupScene(n)));
    steps.forEach((n) => near(n, () => once(n, 0.5, () => n.classList.add('md-hop'))));

    reduce.addEventListener('change', () => {
      if (!reduce.matches) return;
      /* Zurück zum statischen Endbild */
      watcher.disconnect();
      lookers.length = 0;
      toggles.length = 0;
      controls = false;
      waiting.clear();
      document.querySelectorAll('.md-rig, .md-toggle, .agx-token, .md-dots').forEach((n) => n.remove());
      if (hero) {
        [...hero.children].forEach((n) => n.removeAttribute('aria-hidden'));
        hero.setAttribute('aria-hidden', 'true');
      }
      document.querySelectorAll('.md-alive, .md-off, .md-greet, .md-wave, .md-hop, .is-armed, .is-split').forEach((n) => {
        if (n.classList.contains('is-split')) n.replaceChildren();
        n.classList.remove('md-alive', 'md-off', 'md-greet', 'md-wave', 'md-hop', 'is-armed', 'is-split');
      });
      root.classList.remove('md-still', 'md-hidden');
    });
  }

  if (!('IntersectionObserver' in window)) { loadStyles().catch(unstyled); return; }

  const idle = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 200));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
})();
