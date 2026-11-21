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
    soundToggle.setAttribute('aria-label', soundsOn ? 'UI-Sounds ausschalten' : 'UI-Sounds einschalten');
    soundToggle.querySelector('.sound-off').hidden = soundsOn;
    soundToggle.querySelector('.sound-on').hidden = !soundsOn;
  }
  renderSound();
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
  document.querySelectorAll('.cap-tile, .prod').forEach((el) => {
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
    if (avatar) {
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
      const r = hero.getBoundingClientRect();
      const dx = (ev.clientX - r.left) / r.width - 0.5;
      const dy = (ev.clientY - r.top) / r.height - 0.5;
      img.style.translate = `${(dx * 18).toFixed(1)}px ${(dy * 12).toFixed(1)}px`;
      img.style.rotate = `${(dx * 4).toFixed(2)}deg`;
    });
    hero.addEventListener('pointerleave', () => { img.style.translate = '0 0'; img.style.rotate = '0deg'; });
  }
})();
