/* MD-Avatar und Agenten-Szenen.
   Lädt agents.css erst nahe am Viewport (Platz reserviert der kleine <style>-Block im HTML),
   startet Bewegung nur im Viewport und hält sie sonst an.
   Ohne IntersectionObserver oder bei "Bewegung reduzieren" bleibt der Endzustand stehen. */
(() => {
  const targets = document.querySelectorAll('[data-agx], [data-greet]');
  if (!targets.length) return;
  const href = new URL('agents.css', document.currentScript.src).href;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const loadStyles = () => new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', resolve);
    document.head.append(link);
  });

  /* Einmaliger Gruß: Gastgeber im Kontakt-Block, Avatar vor dem Bot-Team */
  function greetOnce() {
    const greet = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-greeting');
        greet.unobserve(e.target);
      }
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-greet]').forEach((el) => greet.observe(el));
  }

  /* Szene: Schleife mit Pause-Knopf (WCAG 2.2.2) */
  function loop(scene) {
    let visible = false;
    let paused = false;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'agx-toggle';
    const render = () => {
      scene.classList.toggle('is-live', visible && !paused);
      button.textContent = paused ? 'Weiter' : 'Pause';
      button.setAttribute('aria-label', paused ? 'Weiter: Animation fortsetzen' : 'Pause: Animation anhalten');
    };
    button.addEventListener('click', () => { paused = !paused; render(); });
    scene.querySelector('.agx-top').append(button);
    scene.classList.add('is-armed');
    render();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      render();
    }, { threshold: 0.25 });
    io.observe(scene);

    reduce.addEventListener('change', () => {
      if (!reduce.matches) return;
      io.disconnect();
      scene.classList.remove('is-armed', 'is-live');
      button.remove();
    });
  }

  if (!('IntersectionObserver' in window)) { loadStyles(); return; }

  const near = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    near.disconnect();
    loadStyles().then(() => {
      if (reduce.matches) return;
      greetOnce();
      document.querySelectorAll('[data-agx]').forEach(loop);
    });
  }, { rootMargin: '1200px 0px' });
  targets.forEach((el) => near.observe(el));
})();
