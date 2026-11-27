/* Moellenbeck-Digital 2026 – Interaktion
   Prinzip: dezente Motion, rAF-gedrosselt, prefers-reduced-motion wird respektiert. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (id) => document.getElementById(id);

  /* ── Nav: Mobile-Menü + Zustand beim Scrollen ── */
  const navMenu = document.querySelector('.nav-menu');
  const mq = window.matchMedia('(max-width: 760px)');
  const syncMenu = () => { if (mq.matches) navMenu.removeAttribute('open'); else navMenu.setAttribute('open', ''); };
  syncMenu();
  mq.addEventListener('change', syncMenu);
  navMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { if (mq.matches) navMenu.removeAttribute('open'); }));
  navMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mq.matches && navMenu.open) {
      navMenu.open = false; navMenu.querySelector('summary').focus();
    }
  });
  const siteNav = $('siteNav');

  /* ── UI-Sounds: optional, Standard aus ── */
  const soundToggle = $('soundToggle');
  let soundsOn = false;
  try { soundsOn = localStorage.getItem('md-sounds') === 'on'; } catch (e) { /* privat-modus */ }
  let ctx = null;
  function blip(freq = 880, len = 0.07, vol = 0.06) {
    if (!soundsOn) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime;
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq / 2, t + len);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.start(t); o.stop(t + len);
    } catch (e) { /* ignorieren */ }
  }
  function renderSound() {
    soundToggle.setAttribute('aria-pressed', String(soundsOn));
    $('soundState').textContent = soundsOn ? 'an' : 'aus';
    // SVG elements do not reflect the HTML hidden property to an attribute.
    soundToggle.querySelector('.sound-off').toggleAttribute('hidden', soundsOn);
    soundToggle.querySelector('.sound-on').toggleAttribute('hidden', !soundsOn);
  }
  renderSound();
  $('soundSetting').hidden = false;
  soundToggle.addEventListener('click', () => {
    soundsOn = !soundsOn;
    try { localStorage.setItem('md-sounds', soundsOn ? 'on' : 'off'); } catch (e) { /* ok */ }
    renderSound(); blip(660);
  });
  document.querySelectorAll('[data-sound="click"]').forEach((el) => el.addEventListener('click', () => blip()));

  /* ── Reveal: Fade-up + Blur-in ── */
  if ('IntersectionObserver' in window && !reduce.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
  }

  /* ── Hover-Glow folgt dem Zeiger ── */
  document.querySelectorAll('.cap-tile').forEach((el) => {
    el.addEventListener('pointermove', (ev) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${ev.clientX - r.left}px`);
      el.style.setProperty('--my', `${ev.clientY - r.top}px`);
    });
  });

  /* ── Film: Vorschau stumm, Klick = Film mit Ton ── */
  const video = $('filmVideo');
  const player = $('player');
  const playPill = $('playPill');
  const playLabel = $('playLabel');
  const mutePill = $('mutePill');
  const meta = $('playerMeta');
  const bar = $('progressBar');
  const PREVIEW = 'assets/video/v6-preview.mp4';
  const MAIN = 'assets/video/v6-main.mp4';
  let mode = 'preview'; // preview | main
  let inView = false;

  function setState(s) {
    player.dataset.state = s;
    if (s === 'preview') {
      playLabel.textContent = 'Mit Ton ansehen';
      playPill.setAttribute('aria-label', 'Film mit Ton abspielen');
      mutePill.hidden = true; meta.textContent = 'EN · 48 s';
    } else if (s === 'playing') {
      playLabel.textContent = 'Pause';
      playPill.setAttribute('aria-label', 'Film pausieren');
      mutePill.hidden = false;
    } else if (s === 'paused') {
      playLabel.textContent = 'Weiter';
      playPill.setAttribute('aria-label', 'Film fortsetzen');
      mutePill.hidden = false;
    }
  }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return `0:${String(t).padStart(2, '0')}`; }

  function startMain() {
    mode = 'main';
    video.pause();
    video.loop = false;
    video.src = MAIN;
    video.muted = false;
    video.setAttribute('aria-label', 'One team of humans and agents – Film mit Ton, Englisch, 48 Sekunden');
    video.play().then(() => setState('playing')).catch(() => { video.muted = true; video.play().catch(() => {}); setState('playing'); renderMute(); });
    document.body.classList.add('film-playing');
  }
  function backToPreview() {
    mode = 'preview';
    video.src = PREVIEW; video.muted = true; video.loop = true;
    video.setAttribute('aria-label', 'One team of humans and agents – Vorschau ohne Ton');
    setState('preview'); bar.style.transform = 'scaleX(0)';
    document.body.classList.remove('film-playing');
    if (inView && !reduce.matches) video.play().catch(() => {});
  }
  function renderMute() {
    mutePill.setAttribute('aria-label', video.muted ? 'Ton an' : 'Ton aus');
    mutePill.classList.toggle('is-muted', video.muted);
  }

  if (video) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        for (const e of entries) {
          inView = e.isIntersecting;
          if (mode === 'preview') {
            if (inView && !reduce.matches) {
              if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
              video.play().catch(() => {});
            } else video.pause();
          } else if (!inView && !video.paused) { video.pause(); setState('paused'); }
        }
      }, { threshold: 0.2 }).observe(video);
    }

    playPill.addEventListener('click', () => {
      if (mode === 'preview') return startMain();
      if (video.paused) { video.play().catch(() => {}); setState('playing'); }
      else { video.pause(); setState('paused'); }
    });
    mutePill.addEventListener('click', () => { video.muted = !video.muted; renderMute(); });
    video.addEventListener('click', () => playPill.click());
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      bar.style.transform = `scaleX(${video.currentTime / video.duration})`;
      if (mode === 'main') meta.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
    });
    video.addEventListener('ended', () => { if (mode === 'main') backToPreview(); });
  }

  /* ── Scroll-Szene: Film-Bühne wächst, Avatar-Parallax, Nav-Zustand ── */
  const track = $('filmTrack');
  const stage = $('filmStage');
  const head = $('filmHead');
  const avatar = $('avatarParallax');
  let ticking = false;

  function frame() {
    ticking = false;
    const vh = window.innerHeight;
    siteNav.classList.toggle('is-scrolled', window.scrollY > 24);
    if (reduce.matches) return;

    if (track && stage) {
      const r = track.getBoundingClientRect();
      const total = Math.max(1, track.offsetHeight - vh);
      // 0 = Bühne kommt von unten, 1 = Ende der Sticky-Strecke
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + total * 0.55)));
      const e = 1 - Math.pow(1 - p, 3);
      stage.style.setProperty('--p', e.toFixed(4));
      if (head) head.style.opacity = String(Math.max(0, 1 - e * 1.6));
    }
    if (avatar && !document.documentElement.classList.contains('md-still')) {
      const y = window.scrollY;
      if (y < vh * 1.2) avatar.style.transform = `translate3d(0, ${(y * -0.12).toFixed(1)}px, 0)`;
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();


  /* Zeiger-Parallax für den Avatar (nur Desktop, nur mit Motion) */
  const hero = $('hero');
  if (hero && avatar && !reduce.matches && window.matchMedia('(pointer: fine)').matches) {
    const img = avatar.querySelector('img');
    hero.addEventListener('pointermove', (ev) => {
      if (document.documentElement.classList.contains('md-still')) return;
      const r = hero.getBoundingClientRect();
      const dx = (ev.clientX - r.left) / r.width - 0.5;
      const dy = (ev.clientY - r.top) / r.height - 0.5;
      img.style.translate = `${(dx * 18).toFixed(1)}px ${(dy * 12).toFixed(1)}px`;
    });
    hero.addEventListener('pointerleave', () => { if (!document.documentElement.classList.contains('md-still')) img.style.translate = '0 0'; });
  }

  /* ── Kontaktformular: Validierung + mailto-Versand (kein externer Dienst) ── */
  const form = $('contactForm');
  if (form) {
    const TO = 'admin@moellenbeck-digital.io';
    const subject = $('cfSubject');
    const status = $('formStatus');
    const rules = [
      ['cfName', (v) => v.trim().length >= 2, 'Bitte geben Sie Ihren Namen ein.'],
      ['cfMail', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'],
      ['cfSubject', (v) => v !== '', 'Bitte wählen Sie einen Betreff.'],
      ['cfMsg', (v) => v.trim().length >= 10, 'Bitte schreiben Sie mindestens 10 Zeichen.'],
    ];
    const check = (id) => {
      const [, ok, msg] = rules.find((r) => r[0] === id);
      const el = $(id); const err = $(`${id}Err`);
      const valid = ok(el.value);
      el.setAttribute('aria-invalid', String(!valid));
      err.textContent = valid ? '' : msg;
      return valid;
    };
    rules.forEach(([id]) => $(id).addEventListener('blur', () => { if ($(id).value) check(id); }));
    rules.forEach(([id]) => $(id).addEventListener('input', () => { if ($(id).getAttribute('aria-invalid') === 'true') check(id); }));

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const bad = rules.map(([id]) => check(id) ? null : id).filter(Boolean);
      if (bad.length) { status.textContent = 'Bitte prüfen Sie die markierten Felder.'; $(bad[0]).focus(); return; }
      const name = $('cfName').value.trim();
      const mail = $('cfMail').value.trim();
      const body = `${$('cfMsg').value.trim()}\n\n—\nName: ${name}\nE-Mail: ${mail}`;
      const href = `mailto:${TO}?subject=${encodeURIComponent(`[Website] ${subject.value} – ${name}`)}&body=${encodeURIComponent(body)}`;
      status.textContent = 'Ihr E-Mail-Programm öffnet sich mit der fertigen Nachricht. Bitte dort absenden.';
      window.location.href = href;
    });

    /* CTA mit data-subject: springt zum Formular und setzt den Betreff vor */
    document.querySelectorAll('[data-subject]').forEach((a) => a.addEventListener('click', () => {
      subject.value = a.dataset.subject;
      if (subject.getAttribute('aria-invalid') === 'true') check('cfSubject');
      setTimeout(() => $('cfName').focus({ preventScroll: true }), reduce.matches ? 0 : 600);
    }));
    const pre = new URLSearchParams(location.search).get('betreff');
    if (pre && [...subject.options].some((o) => o.value === pre || o.text === pre)) subject.value = pre;
  }

  /* ── Easter Eggs (nur mit JS; ohne JS bleibt alles unverändert) ── */
  // BloomMD: unscheinbarer Knoten öffnet eine versteckte Notiz
  const bloomBtn = $('bloomEgg'), bloomLeaf = $('bloomLeaf'), bloomNote = $('bloomNote'), bloomHost = $('eggBloom');
  if (bloomBtn && bloomLeaf && bloomNote && bloomHost) {
    const place = () => {
      const h = bloomHost.getBoundingClientRect(), r = bloomLeaf.getBoundingClientRect();
      const w = Math.max(r.width, 28), hh = Math.max(r.height, 24);
      bloomBtn.style.left = `${r.left - h.left + r.width / 2 - w / 2}px`;
      bloomBtn.style.top = `${r.top - h.top + r.height / 2 - hh / 2}px`;
      bloomBtn.style.width = `${w}px`; bloomBtn.style.height = `${hh}px`;
    };
    bloomBtn.hidden = false; place();
    window.addEventListener('resize', place, { passive: true });
    const setOpen = (open) => {
      bloomNote.hidden = !open; bloomBtn.setAttribute('aria-expanded', String(open));
      bloomHost.classList.toggle('egg-open', open);
      if (open) blip(990, .09);
    };
    bloomBtn.addEventListener('click', () => setOpen(bloomNote.hidden));
    bloomHost.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !bloomNote.hidden) { setOpen(false); bloomBtn.focus(); } });
  }

  // wave-mesh: nach dem 3. Tipp läuft eine Welle durchs Netz
  const meshBtn = $('meshEgg'), meshHost = $('eggMesh'), meshMsg = $('meshMsg');
  if (meshBtn && meshHost && meshMsg) {
    const nodes = [...meshHost.querySelectorAll('.mesh-nodes circle')];
    const MSG = '// angekommen: Ende-zu-Ende über WireGuard. Auch der Server kann nicht mitlesen.';
    let taps = 0, busy = false;
    meshBtn.hidden = false;
    const nearest = (ev) => {
      if (!ev || !ev.clientX) return nodes[taps % nodes.length];
      let best = nodes[0], d = Infinity;
      for (const n of nodes) { const r = n.getBoundingClientRect(); const dd = (r.left + r.width / 2 - ev.clientX) ** 2 + (r.top + r.height / 2 - ev.clientY) ** 2; if (dd < d) { d = dd; best = n; } }
      return best;
    };
    const ping = (n) => { if (reduce.matches) return; n.classList.remove('ping'); void n.getBoundingClientRect(); n.classList.add('ping'); };
    meshBtn.addEventListener('click', (ev) => {
      if (busy) return;
      taps += 1; blip(520 + taps * 120, .06, .04);
      ping(nearest(ev));
      if (taps < 3) return;
      taps = 0; busy = true;
      if (reduce.matches) { meshMsg.textContent = MSG; meshHost.classList.add('egg-done'); busy = false; return; }
      meshHost.classList.add('egg-wave');
      nodes.forEach((n, i) => setTimeout(() => ping(n), 180 + i * 220));
      setTimeout(() => { meshMsg.textContent = MSG; meshHost.classList.add('egg-done'); }, 180 + nodes.length * 220);
      setTimeout(() => { meshHost.classList.remove('egg-wave'); busy = false; }, 2400);
    });
  }

  /* ── Unterseite Hausverwaltung: stummes Video spielt nur, wenn sichtbar ── */
  const hvVideo = $('hvVideo');
  if (hvVideo && 'IntersectionObserver' in window && !reduce.matches) {
    hvVideo.removeAttribute('controls'); // ohne JS/IO/reduced-motion bleiben die Bedienelemente
    // Video erst nach dem Laden der Seite holen (preload bleibt bis dahin "none"), dann nur abspielen, wenn sichtbar
    const startVideo = () => new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { if (hvVideo.preload === 'none') { hvVideo.preload = 'metadata'; hvVideo.load(); } hvVideo.play().catch(() => {}); }
        else hvVideo.pause();
      }
    }, { threshold: 0.25 }).observe(hvVideo);
    const later = () => (window.requestIdleCallback ? requestIdleCallback(startVideo, { timeout: 3000 }) : setTimeout(startVideo, 1500));
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  } else if (hvVideo) { hvVideo.controls = true; }

  /* Mikro-Szenen liegen unter dem ersten Bildschirm: beim ersten Scrollen oder Zeigen holen, sonst nach 5 s */
  addEventListener('load', () => {
    const wake = ['scroll', 'pointermove', 'pointerdown', 'keydown'];
    let timer = 0;
    const go = () => {
      clearTimeout(timer);
      wake.forEach((type) => removeEventListener(type, go));
      document.body.append(Object.assign(document.createElement('script'), { src: 'assets/motion.js' }));
    };
    wake.forEach((type) => addEventListener(type, go, { passive: true }));
    timer = setTimeout(go, scrollY ? 0 : 5000);
  }, { once: true });
})();
