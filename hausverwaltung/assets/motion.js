/* Agentische Mikro-Szenen.
   main.js holt diese Datei nach "load" beim ersten Scrollen oder Zeigen (sonst nach 5 s); sie lädt motion.css
   und baut jede Szene erst nahe am Viewport.
   Alle Elemente sind Dekoration (aria-hidden, per Skript erzeugt, absolut platziert): ohne JS ändert sich
   nichts am Inhalt, und kein Layout verschiebt sich.
   Grundzustand = Endzustand. .mx-arm blendet den Aufbau vor dem ersten Lauf aus, .mx-play spielt Aufbau
   und Handlung einmal, .mx-replay (Hover, feiner Zeiger) nur die Handlung. Alle Abläufe sind CSS-Animationen
   unter 5 s, darum halten Viewport, versteckter Tab und html.md-still sie ohne Zusatzlogik an.
   Bei "Bewegung reduzieren" bleibt das Endbild stehen. */
(() => {
  const root = document.documentElement;
  const base = document.currentScript.src;
  const asset = (path) => new URL(path, base).href;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const still = () => root.classList.contains('md-still');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ── Bausteine ── */
  const NS = 'http://www.w3.org/2000/svg';
  const h = (cls, ...kids) => {
    const node = document.createElement('span');
    node.className = cls;
    node.append(...kids);
    return node;
  };
  const deco = (node) => { node.setAttribute('aria-hidden', 'true'); return node; };
  const s = (tag, attrs = {}, ...kids) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    node.append(...kids);
    return node;
  };
  const g = (...kids) => s('g', {}, ...kids);
  const box = (x, y, width, height, rx = 5, cls = 'mx-box') => s('rect', { x, y, width, height, rx, class: cls });
  const line = (d, cls = 'mx-line') => s('path', { d, class: cls });
  const dot = (cx, cy, r, cls = 'mx-fill') => s('circle', { cx, cy, r, class: cls });
  const label = (x, y, text, anchor = 'start') => s('text', { x, y, 'text-anchor': anchor, class: 'mx-text' }, text);
  const tick = (x, y, cls = 'mx-tick') => s('path', { d: `M${x - 3.6} ${y}l2.6 2.8l5-5.6`, class: cls });

  /* Aufbau (einmal) und Handlung (auch bei Hover). Ein Element trägt nur eines von beidem. */
  const build = (node, kind, delay = 0) => {
    node.classList.add('mx-b', `mx-b-${kind}`);
    node.style.setProperty('--d', `${delay}s`);
    if (kind === 'draw') node.setAttribute('pathLength', '1');
    return node;
  };
  const act = (node, kind, delay = 0) => {
    node.classList.add('mx-a', `mx-a-${kind}`);
    node.style.setProperty('--a', `${delay}s`);
    return node;
  };
  /* Weg aus sieben Punkten; die Keyframes lesen --x0…--y6 */
  const route = (node, points) => {
    points.forEach(([x, y], i) => {
      node.style.setProperty(`--x${i}`, `${x.toFixed(1)}px`);
      node.style.setProperty(`--y${i}`, `${y.toFixed(1)}px`);
    });
    return node;
  };
  /* Sieben Punkte auf einer SVG-Kurve, an den Enden langsamer */
  const along = (d) => {
    const path = s('path', { d });
    const length = path.getTotalLength();
    return [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const t = i / 6;
      const p = path.getPointAtLength(length * (t * t * (3 - 2 * t)));
      return [p.x, p.y];
    });
  };
  const traveller = (points, delay, r = 3) => act(route(dot(0, 0, r, 'mx-token'), points), 'travel', delay);

  const botImg = (color, cls = 'mx-bot') => {
    const img = document.createElement('img');
    img.className = cls;
    img.src = asset(`img/bots/bot-${color}.webp`);
    img.width = 280;
    img.height = 320;
    img.alt = '';
    img.decoding = 'async';
    return img;
  };
  /* Bot als SVG-Bild mit weichem Rand (wie .cap-bot) */
  let masks = 0;
  const svgBot = (svg, color, x, y, width) => {
    masks += 1;
    const id = `mx-soft-${masks}`;
    const stop = (offset, opacity) => s('stop', { offset, 'stop-color': '#fff', 'stop-opacity': opacity });
    svg.append(s('defs', {},
      s('radialGradient', { id: `${id}-g` }, stop('0.5', 1), stop('0.92', 0)),
      s('mask', { id, maskContentUnits: 'objectBoundingBox' }, s('rect', { width: 1, height: 1, fill: `url(#${id}-g)` }))));
    return s('image', { href: asset(`img/bots/bot-${color}.webp`), x, y, width, height: (width * 8) / 7, mask: `url(#${id})`, class: 'mx-svgbot' });
  };

  /* ── Motor ── */
  let styles;
  const loadStyles = () => {
    styles = styles || new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = asset('motion.css');
      link.addEventListener('load', resolve);
      link.addEventListener('error', reject);
      document.head.append(link);
    });
    return styles;
  };

  const scenes = new Map(); /* Auslöser -> Szene */
  const hosts = new Map();  /* Host -> Szene */
  let player;
  let watcher;
  let resizer;

  const visibleEnough = (entry) => entry.isIntersecting
    && (entry.intersectionRatio >= 0.42 || entry.intersectionRect.height >= window.innerHeight * 0.4);

  function run(scene, mode, offset = 0) {
    const { host } = scene;
    host.classList.remove('mx-arm', 'mx-play', 'mx-replay');
    if (reduce.matches || still()) return;
    host.style.setProperty('--s', `${offset}s`);
    host.style.setProperty('--skip', `${scene.skip}s`);
    void host.offsetWidth; /* Neustart: Stil einmal berechnen lassen */
    host.classList.add(mode);
    scene.busy = performance.now() + (offset + (mode === 'mx-play' ? scene.time : scene.time - scene.skip)) * 1000;
  }

  /* host: Element mit der Szene · trigger: was sichtbar sein muss · make: baut die Dekoration, liefert optional layout()
     time: Dauer des ersten Laufs · skip: Beginn der Handlung (für Hover) · stagger: Versatz je gleichzeitig sichtbarer Szene */
  function scene({ host, trigger = host, make, time = 3, skip = 0, stagger = 0, hover = false }) {
    if (!host || !trigger) return;
    const spec = { host, trigger, time, skip, stagger, hover, played: false, seen: false, busy: 0 };
    const near = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      near.disconnect();
      loadStyles().then(() => {
        host.classList.add('mx');
        spec.layout = make(host) || null;
        hosts.set(host, spec);
        if (spec.layout) { spec.layout(); resizer.observe(host); }
        watcher.observe(host);
        if (reduce.matches) return;
        if (hover) host.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse' || !fine.matches || still() || reduce.matches) return;
          if (!spec.played || performance.now() < spec.busy) return;
          run(spec, 'mx-replay');
        });
        /* Schon im Bild: nichts verstecken, nur die Handlung zeigen */
        spec.seen = trigger.getBoundingClientRect().top < window.innerHeight;
        if (spec.seen) host.classList.add('mx-fresh');
        else if (!still()) host.classList.add('mx-arm');
        scenes.set(trigger, spec);
        player.observe(trigger);
      }, () => {});
    }, { rootMargin: '700px 0px' });
    near.observe(trigger);
  }

  /* ════ Fähigkeiten: jede Kachel zeigt eine Handlung zu ihrem eigenen Inhalt ════ */
  const capPanels = {
    blue(svg) { /* Wissen und Werkzeuge verbinden */
      const a = 'M40 23C96 23 108 50 168 50';
      const b = 'M40 77C96 77 108 62 168 62';
      const paper = g(box(8, 7, 32, 32, 8), line('M17 17h14M17 23h14M17 29h9', 'mx-ink'));
      const tool = g(box(8, 61, 32, 32, 8), line('M18 85l9-9M26 69a7 7 0 1 0 8 8l-4 1l-3-3l1-4a7 7 0 0 0-2-2z', 'mx-ink'));
      const hub = g(dot(188, 56, 20, 'mx-hub'), line('M180 50l7 6l-7 6M190 63h8', 'mx-ink mx-ink--tone'));
      svg.append(
        build(paper, 'pop', 0.15), build(label(8, 51, 'Wissen'), 'fade', 0.35),
        build(tool, 'pop', 0.3), build(label(8, 105, 'Werkzeuge'), 'fade', 0.5),
        build(line(a), 'draw', 0.55), build(line(b), 'draw', 0.7),
        build(hub, 'pop', 0.95),
        traveller(along(a), 1.25), traveller(along(b), 1.45),
        act(dot(188, 56, 20, 'mx-ring'), 'ring', 2.05),
      );
    },
    violet(svg) { /* BPMN-Ablauf mit Prüfung und Freigabe */
      svg.append(
        build(dot(14, 48, 9, 'mx-box'), 'pop', 0.1),
        build(line('M23 48H40'), 'draw', 0.25),
        build(g(box(40, 30, 62, 36, 7), line('M50 41h30M50 55h20', 'mx-ink')), 'pop', 0.4),
        build(label(71, 87, 'Prüfung', 'middle'), 'fade', 0.55),
        build(line('M102 48H118'), 'draw', 0.6),
        build(g(s('path', { d: 'M132 34l14 14l-14 14l-14-14z', class: 'mx-box' }), line('M132 42v12M126 48h12', 'mx-ink')), 'pop', 0.75),
        build(line('M146 48H172'), 'draw', 0.9),
        build(dot(190, 48, 18, 'mx-box mx-box--end'), 'pop', 1.05),
        build(label(190, 87, 'Freigabe', 'middle'), 'fade', 1.15),
        traveller([[14, 48], [32, 48], [54, 66], [88, 66], [118, 52], [150, 48], [172, 48]], 1.35),
        act(g(build(g(dot(98, 33, 8, 'mx-badge'), tick(98, 33, 'mx-tick mx-tick--ink')), 'pop', 1.95)), 'bump', 1.95),
        act(g(build(g(dot(190, 48, 11, 'mx-ok'), tick(190, 48, 'mx-tick mx-tick--ok')), 'pop', 2.65)), 'bump', 2.65),
        act(dot(190, 48, 18, 'mx-ring mx-ring--ok'), 'ring', 2.75),
      );
    },
    pink(svg) { /* Web & Apps: Oberfläche entsteht, bis ins Deployment */
      const part = (x, y, w, ht, delay, cls = 'mx-bar') => act(g(build(box(x, y, w, ht, 3, cls), 'slide', delay)), 'lift', delay + 1.25);
      svg.append(
        build(g(box(8, 4, 150, 84, 7), line('M8 18H158', 'mx-line mx-line--soft'), dot(17, 11, 2, 'mx-dim'), dot(24, 11, 2, 'mx-dim'), dot(31, 11, 2, 'mx-dim')), 'pop', 0.1),
        build(box(172, 8, 40, 76, 9), 'pop', 0.25),
        part(17, 26, 78, 8, 0.45, 'mx-fill'), part(17, 40, 120, 5, 0.55),
        part(17, 52, 62, 27, 0.7), part(87, 52, 62, 27, 0.8),
        part(178, 18, 28, 6, 0.95, 'mx-fill'), part(178, 29, 28, 28, 1.05), part(178, 62, 28, 6, 1.15),
        build(label(8, 105, 'Deployment'), 'fade', 1.25),
        build(box(82, 100, 108, 4, 2, 'mx-bar'), 'fade', 1.25),
        act(box(82, 100, 108, 4, 2, 'mx-fill mx-progress'), 'refill', 1.4),
        act(g(build(g(dot(204, 102, 8, 'mx-badge'), tick(204, 102, 'mx-tick mx-tick--ink')), 'pop', 2.35)), 'bump', 2.35),
      );
    },
    green(svg) { /* selbst gehostet, Daten unter eigener Kontrolle */
      [0, 1, 2].forEach((i) => {
        const y = 6 + i * 31;
        svg.append(build(g(box(10, y, 124, 25, 6), line(`M54 ${y + 9}h66M54 ${y + 16}h44`, 'mx-ink')), 'slide', 0.15 + i * 0.18),
          dot(23, y + 12.5, 3, 'mx-dim'), dot(35, y + 12.5, 3, 'mx-dim'),
          act(g(build(dot(23, y + 12.5, 3), 'pop', 0.8 + i * 0.22)), 'blink', 1.7 + i * 0.18),
          act(g(build(dot(35, y + 12.5, 3, 'mx-fill mx-fill--soft'), 'pop', 0.9 + i * 0.22)), 'blink', 1.82 + i * 0.18));
      });
      svg.append(
        build(line('M134 50H170'), 'draw', 1.35),
        build(box(170, 47, 42, 33, 7), 'pop', 1.5),
        act(g(build(line('M179 47V37a12 12 0 0 1 24 0v10', 'mx-shackle'), 'shackle', 1.9)), 'latch', 1.9),
        build(g(dot(191, 61, 3.5), line('M191 62v8', 'mx-line mx-line--tone')), 'fade', 2.2),
        build(label(10, 109, 'selbst gehostet'), 'fade', 1.4),
        traveller([[134, 50], [140, 50], [146, 50], [152, 50], [158, 50], [164, 50], [170, 50]], 2.35),
      );
    },
  };

  function capScenes() {
    $$('#services .cap-tile').forEach((tile) => {
      const bot = $('.cap-bot', tile);
      const color = bot && (/bot-(\w+)\.webp/.exec(bot.getAttribute('src')) || [])[1];
      if (!capPanels[color]) return;
      scene({
        host: tile, time: 3.4, skip: 1.1, stagger: 0.16, hover: true,
        make() {
          const svg = deco(s('svg', { viewBox: '0 0 216 112', class: 'mx-panel', preserveAspectRatio: 'xMinYMid meet', focusable: 'false' }));
          capPanels[color](svg);
          tile.append(svg);
          act(bot, 'reach', color === 'violet' ? 1.2 : 1.1);
          const num = $('.cap-num', tile);
          build(num, 'num', 0.05);
          return () => {
            const left = num.offsetLeft;
            const top = 22;
            const width = Math.min(292, bot.offsetLeft + bot.offsetWidth * 0.19 - left);
            const height = Math.min(152, num.offsetTop - top - 14);
            const fits = width >= 104 && height >= 54;
            svg.style.display = fits ? '' : 'none';
            if (!fits) return;
            Object.assign(svg.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
            svg.classList.toggle('mx-small', Math.min(width / 216, height / 112) < 0.76);
          };
        },
      });
    });
  }

  /* ════ Plattform: Bots arbeiten am jeweiligen Produkt (nur, was die Karte schon sagt) ════ */
  function terminal() {
    const card = $('#plattform .pcard--anchor');
    const term = card && $('.term', card);
    if (!term) return;
    scene({
      host: card, trigger: term, time: 3.6, skip: 0.2, hover: true,
      make() {
        const rows = $$('.term-row', term);
        const colors = ['blue', 'violet', 'yellow'];
        const team = deco(h('mx-team'));
        rows.forEach((row, i) => {
          build(row, 'slide', 0.2 + i * 0.5);
          if (i >= colors.length) return;
          const sweep = act(deco(h('mx-sweep')), 'sweep', 0.3 + i * 0.5);
          sweep.style.setProperty('--c', $('.who', row).style.getPropertyValue('--a'));
          row.append(sweep);
          team.append(h('mx-member', act(botImg(colors[i]), 'hop', 0.25 + i * 0.5)));
        });
        build($('.term-gate', term), 'in', 2.25);
        team.append(h('mx-member mx-member--human', act(h('mx-human'), 'nod', 2.5)));
        const ring = act(deco(h('mx-halo')), 'halo', 2.8);
        $('.term-btn', term).append(ring);
        term.append(team);
        build($('.pcard-num', card), 'num', 0.1);
        /* Die Eingabezeile unten ist frei: dort steht das Team, auf jeder Breite */
        const prompt = $('.term-cursor', term);
        return () => {
          team.style.setProperty('--size', `${term.clientWidth >= 480 ? 44 : 32}px`);
          team.style.top = `${prompt.offsetTop + prompt.offsetHeight / 2}px`;
          team.style.right = getComputedStyle(term).paddingRight;
        };
      },
    });
  }

  function organisation() {
    const org = $('#plattform .org');
    if (!org) return;
    scene({
      host: org, time: 3.9, skip: 1.4, hover: true,
      make() {
        const nodes = $$('.org-node', org);
        const [human, chief, ...team] = nodes;
        nodes.forEach((node, i) => build(node, 'rise', [0.1, 0.4, 0.75, 0.85, 0.95, 1.05][i] || 0));
        const dots = team.map((node, i) => {
          const d = act(deco(h('mx-pip')), 'travel', 1.45 + i * 0.12);
          d.style.setProperty('--c', node.style.getPropertyValue('--t'));
          org.append(d);
          return d;
        });
        team.forEach((node, i) => act($('img', node), 'hop', 2.05 + i * 0.12));
        /* Tester und Reviewer prüfen unabhängig */
        [team[1], team[2]].forEach((node, i) => {
          if (!node) return;
          node.append(deco(h('mx-check', act(h('mx-check-in', build(h('mx-check-dot'), 'pop', 2.7 + i * 0.25)), 'bump', 2.7 + i * 0.25))));
        });
        act($('.org-m', human), 'nod', 3.15);
        /* Lage im Diagramm aus offset-Werten: unabhängig von laufenden Transforms */
        const within = (node) => {
          let x = 0;
          let y = 0;
          for (let n = node; n && n !== org; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
          return [x + node.offsetWidth / 2, y, node.offsetHeight];
        };
        return () => {
          const [cx, ly, lh] = within($('.org-l', chief));
          const bar = within($('.org-team', org))[1] - 7;
          dots.forEach((d, i) => {
            const [tx, ty, th] = within($('img', team[i]));
            const end = ty + th * 0.2;
            /* Weg unter der Beschriftung los, über die Verteil-Linie zum Agenten */
            route(d, [[cx, ly + lh + 2], [cx, bar], [cx + (tx - cx) * 0.33, bar], [cx + (tx - cx) * 0.66, bar], [tx, bar], [tx, (bar + end) / 2], [tx, end]]);
          });
        };
      },
    });
  }

  function productCards() {
    $$('#plattform .pcard:not(.pcard--anchor):not(.infra)').forEach((card) => {
      const visual = $('.pcard-visual', card);
      if (!visual) return;
      const inbox = $('.inbox', visual);
      const svg = $(':scope > svg', visual);
      const num = $('.pcard-num', card);
      /* [Bau, Beginn der Handlung] */
      let kind = [() => processScene(svg), 2.0];
      if (inbox) kind = [() => inboxScene(inbox), 0.85];
      else if (visual.id === 'eggBloom') kind = [() => bloomScene(svg), 1.9];
      else if (visual.id === 'eggMesh') kind = [() => meshScene(svg), 1.7];
      const [make, skip] = kind;
      scene({
        host: card, trigger: visual, time: 3.9, skip, stagger: 0.25, hover: true,
        make: () => { build(num, 'num', 0.1); return make(); },
      });
    });
  }

  function processScene(svg) { /* Satz -> Prozessmodell -> Agent prüft -> Mensch entscheidet */
    const kids = [...svg.children];
    const [prompt, text, link, wires, start, task, gate, ask, human, labels] = kids;
    if (!labels) return;
    build(prompt, 'fade', 0); build(text, 'fade', 0.05);
    const cover = build(s('rect', { x: 38, y: 17, width: 262, height: 24, class: 'mx-cover' }), 'cover', 0.15);
    text.after(cover);
    build(link, 'fade', 1.0);
    build(start, 'pop', 1.1); build(wires, 'fade', 1.25); build(task, 'pop', 1.3);
    build(gate, 'pop', 1.45); build(ask, 'pop', 1.6); build(human, 'pop', 1.7);
    [...labels.children].forEach((t, i) => build(t, 'fade', 1.4 + i * 0.18));
    const bot = svgBot(svg, 'green', 68, 46, 46);
    svg.append(
      g(build(g(act(bot, 'svghop', 2.45)), 'pop', 1.5)),
      traveller([[29, 110], [58, 127], [91, 127], [124, 127], [160, 128], [178, 136], [192, 136]], 2.0, 3.5),
      act(s('rect', { x: 192, y: 122, width: 112, height: 28, rx: 4, class: 'mx-glowbox' }), 'flash', 3.15),
    );
  }

  function inboxScene(inbox) { /* Eingang lesen, Notfall erkennen, Entwürfe, wartet auf Freigabe */
    const rows = $$('.inbox-row', inbox);
    const head = $('.inbox-head', inbox);
    rows.forEach((row, i) => {
      build(row, 'slide', 0.15 + i * 0.22);
      const mark = $('.tag, .mut', row);
      if (mark) build(mark, 'pop', 1.15 + i * 0.3);
    });
    build($('.inbox-foot', inbox), 'in', 2.15);
    const scan = act(deco(h('mx-scan')), 'scan', 0.9);
    inbox.append(scan);
    const bot = act(botImg('blue'), 'read', 0.85);
    const seat = deco(h('mx-seat', bot));
    const visual = inbox.parentElement;
    const [title, tag] = head.children;
    visual.append(seat);
    return () => {
      /* Platz in der Kopfzeile, sonst über dem Posteingang (schmale Handys) */
      const free = tag.offsetLeft - (title.offsetLeft + title.offsetWidth);
      const inside = free >= 36;
      const width = inside ? Math.min(40, free - 4) : 30;
      seat.style.display = inside || inbox.offsetTop >= 19 ? '' : 'none';
      seat.style.width = `${width}px`;
      seat.style.left = `${inbox.offsetLeft + (inside ? title.offsetLeft + title.offsetWidth + free / 2 : inbox.offsetWidth / 2)}px`;
      seat.style.top = `${inside ? inbox.offsetTop + head.offsetTop + head.offsetHeight / 2 : inbox.offsetTop - 9}px`;
      scan.style.top = `${rows[0].offsetTop}px`;
      scan.style.height = `${rows[0].offsetHeight}px`;
      scan.style.setProperty('--travel', `${rows[rows.length - 1].offsetTop - rows[0].offsetTop}px`);
    };
  }

  function bloomScene(svg) { /* Notizen werden zur Mindmap: Knoten wachsen */
    const [wires, rootBox, b1, b2, b3, leaf1, leaf2, labels] = [...svg.children];
    if (!labels) return;
    const [t0, t1, t2, t3] = [...labels.children];
    const paths = [...wires.children];
    build(rootBox, 'pop', 0.1); build(t0, 'fade', 0.25);
    [[b1, t1], [b2, t2], [b3, t3]].forEach(([node, text], i) => {
      build(paths[i], 'draw', 0.5 + i * 0.3);
      build(node, 'pop', 0.85 + i * 0.3); build(text, 'fade', 1.0 + i * 0.3);
    });
    [leaf1, leaf2].forEach((node, i) => { build(paths[3 + i], 'draw', 1.7 + i * 0.2); build(node, 'pop', 2.0 + i * 0.2); });
    const bot = svgBot(svg, 'pink', 40, 103, 56);
    svg.append(
      g(build(g(act(bot, 'svghop', 1.9)), 'rise', 0.2)),
      ...paths.slice(0, 3).map((p, i) => traveller(along(p.getAttribute('d')), 2.3 + i * 0.14)),
    );
  }

  function meshScene(svg) { /* Verbindungen leuchten auf */
    const nodes = $('.mesh-nodes', svg);
    if (!nodes) return;
    const links = ['M60 46L160 86', 'M160 86L260 42', 'M160 86L80 134', 'M160 86L240 134', 'M80 134H240'];
    const lit = g(...links.map((d, i) => build(line(d, 'mx-line mx-line--tone'), 'draw', 0.35 + i * 0.28)));
    const packet = (points, delay) => traveller(points, delay, 4);
    lit.append(
      packet([[60, 46], [93, 59], [127, 73], [160, 86], [193, 71], [227, 56], [260, 42]], 2.0),
      packet([[80, 134], [107, 118], [133, 102], [160, 86], [187, 102], [213, 118], [240, 134]], 2.35),
    );
    nodes.before(lit);
    /* je Knoten: Ring erscheint mit seiner Leitung und pulst, wenn dort ein Paket startet oder ankommt */
    const rings = [[60, 46, 0.6, 2.0], [260, 42, 0.9, 2.95], [80, 134, 1.15, 2.35], [240, 134, 1.45, 3.3]]
      .map(([cx, cy, delay, pulse]) => act(g(build(dot(cx, cy, 11, 'mx-node'), 'pop', delay)), 'bump', pulse));
    nodes.after(...rings);
    svg.append(g(build(g(act(svgBot(svg, 'violet', 137, 1, 46), 'svghop', 1.7)), 'pop', 0.15)));
  }

  /* ════ Film-Teaser: Stationen nacheinander ════ */
  function filmSteps() {
    const list = $('.film-caption .steps');
    if (!list) return;
    scene({
      host: list, time: 1.6,
      make() {
        $$('li', list).forEach((li, i) => {
          build($('span', li), 'num', 0.2 + i * 0.12);
          li.append(act(deco(h('mx-rule')), 'rule', 0.15 + i * 0.12));
        });
      },
    });
  }

  /* ════ Hausverwaltung: Ablauf zeichnet sich nacheinander ein ════ */
  const stepPanels = [
    (svg) => { /* Eingang: Objekt, Einheit, Dringlichkeit */
      svg.append(act(g(build(g(box(2, 30, 30, 22, 4), line('M3 33l14 11l14-11', 'mx-ink mx-ink--tone')), 'enter', 0.25)), 'bump', 0.45));
      ['Objekt', 'Einheit', 'Dringlichkeit'].forEach((name, i) => {
        const y = 18 + i * 23;
        svg.append(build(label(52, y + 3.5, name), 'slide', 0.5 + i * 0.2),
          act(g(build(tick(43, y), 'pop', 0.65 + i * 0.2)), 'bump', 0.65 + i * 0.2));
      });
    },
    (svg) => { /* Entwürfe mit Quelle */
      /* drei Blätter fächern sich auf, dann füllt sich das vorderste */
      [18, 40, 62].forEach((x, i) => {
        const sheet = build(g(box(x, 6 + i * 4, 40, 52, 5, 'mx-box mx-box--sheet')), 'fan', 0.2 + i * 0.1);
        sheet.style.setProperty('--fx', `${(1 - i) * 18}px`);
        svg.append(sheet);
      });
      [0, 1, 2, 3].forEach((i) => svg.append(build(box(69, 24 + i * 8, i === 3 ? 17 : 26, 2.5, 1, 'mx-fill mx-fill--soft'), 'grow', 0.65 + i * 0.15)));
      svg.append(act(g(build(g(box(70, 66, 52, 16, 8, 'mx-chip'), label(96, 77.5, 'Quelle', 'middle')), 'pop', 1.35)), 'bump', 1.35));
    },
    (svg) => { /* Mitarbeiterin klickt auf Freigabe */
      svg.append(
        act(g(build(g(box(8, 30, 90, 30, 8, 'mx-button'), s('text', { x: 53, y: 49, 'text-anchor': 'middle', class: 'mx-text mx-text--button' }, 'Freigabe')), 'pop', 0.25)), 'press', 1.15),
        act(g(build(s('path', { d: 'M91 52l0 19l5-4.6l3.6 8l4.2-1.9l-3.5-7.8l6.8-.4z', class: 'mx-cursor' }), 'pointer', 0.55)), 'click', 1.1),
        act(g(build(g(dot(102, 24, 11, 'mx-ok'), tick(102, 24, 'mx-tick mx-tick--ok')), 'pop', 1.4)), 'bump', 1.4),
        act(dot(102, 24, 11, 'mx-ring mx-ring--ok'), 'ring', 1.5),
      );
    },
    (svg) => { /* Vorgangsakte: Freigaben und Versionen */
      svg.append(act(g(build(g(s('path', { d: 'M3 24h11l4 5h18v30H3z', class: 'mx-box' }), line('M10 40h19M10 47h13', 'mx-ink')), 'enter', 0.2)), 'bump', 0.4),
        build(label(52, 21.5, 'Akte'), 'fade', 0.35));
      ['Freigaben', 'Versionen'].forEach((name, i) => {
        const y = 43 + i * 23;
        svg.append(build(label(63, y + 3.5, name), 'slide', 0.6 + i * 0.25),
          act(g(build(tick(54, y), 'pop', 0.75 + i * 0.25)), 'bump', 0.75 + i * 0.25));
      });
    },
  ];

  function hvSteps() {
    $$('#ablauf .hv-step').forEach((step, i) => {
      if (!stepPanels[i]) return;
      scene({
        host: step, time: 2.1, skip: 0.4, stagger: 0.7, hover: true,
        make() {
          const svg = deco(s('svg', { viewBox: '0 0 138 84', class: 'mx-panel mx-panel--step', preserveAspectRatio: 'xMaxYMid meet', focusable: 'false' }));
          stepPanels[i](svg);
          step.append(svg, deco(build(h('mx-track'), 'grow', 0)));
          build($('.hv-num', step), 'num', 0.15);
        },
      });
    });
  }

  /* ════ Hausverwaltung: Vorteile – je ein kleiner Agent mit einem Zeichen zum Satz ════ */
  const glyphs = [
    /* Eingang sortiert */ () => [['M2 5h20', 0], ['M2 12h14', 1], ['M2 19h8', 2]].map(([d, i]) => build(line(d, 'mx-line mx-line--tone'), 'draw', 0.4 + i * 0.18)),
    /* Alle Beteiligten */ () => [build(line('M3 12L21 4M3 12h18M3 12l18 8', 'mx-line mx-line--soft'), 'draw', 0.4), build(dot(3, 12, 3), 'pop', 0.35), build(dot(22, 4, 2.6), 'pop', 0.75), build(dot(22, 12, 2.6), 'pop', 0.87), build(dot(22, 20, 2.6), 'pop', 0.99)],
    /* Nichts rutscht durch */ () => [act(g(build(line('M5 17h14c-2-2-3-4-3-8a4 4 0 0 0-8 0c0 4-1 6-3 8zM10 20.5a2.5 2.5 0 0 0 4 0', 'mx-line mx-line--tone'), 'draw', 0.35)), 'bell', 1.0)],
    /* Vier-Augen-Prinzip: erst ein Augenpaar, dann das zweite */ () => [0, 1].map((p) => build(g(
      s('rect', { x: 0.7, y: 3 + p * 10.5, width: 24, height: 8.6, rx: 4.3, class: 'mx-line mx-line--tone' }),
      ...[0, 1].map((e) => act(g(dot(8.4 + e * 8.6, 7.3 + p * 10.5, 2)), 'blink', 1.35 + p * 0.25))), 'pop', 0.4 + p * 0.5)),
    /* Beleg auf Knopfdruck */ () => [build(line('M5 2h10l5 5v15H5zM15 2v5h5', 'mx-line mx-line--tone'), 'draw', 0.35), act(g(build(tick(12, 15), 'pop', 1.05)), 'bump', 1.05)],
  ];

  function hvPoints() {
    const colors = ['blue', 'violet', 'pink', 'yellow', 'green'];
    $$('#nutzen .hv-point').forEach((point, i) => {
      if (!glyphs[i]) return;
      scene({
        host: point, time: 2, skip: 0.9, stagger: 0.3, hover: true,
        make() {
          const num = $('.hv-num', point);
          const glyph = deco(s('svg', { viewBox: '0 0 26 24', class: 'mx-glyph', focusable: 'false' }));
          glyph.append(...glyphs[i]());
          const bot = deco(h('mx-helper', build(h('mx-helper-in', act(botImg(colors[i]), 'hop', 0.9)), 'pop', 0.05)));
          point.append(glyph, bot);
          build(num, 'num', 0.1);
          return () => {
            glyph.style.left = `${num.offsetLeft + num.offsetWidth + 14}px`;
            glyph.style.top = `${num.offsetTop + num.offsetHeight / 2}px`;
          };
        },
      });
    });
  }

  /* Breite der längsten Textzeile eines Elements */
  const textWidth = (node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return Math.max(0, ...[...range.getClientRects()].map((r) => r.width));
  };

  /* Sprechblase mit einem Satz von der Seite: Wort für Wort */
  const bubble = (sentence, start) => {
    const node = h('mx-say');
    sentence.split(' ').forEach((word, i) => {
      if (i) node.append(' ');
      const w = build(h('mx-word'), 'fade', start + 0.2 + i * 0.11);
      w.dataset.t = word;
      node.append(w);
    });
    return build(h('mx-say-wrap', node), 'bubble', start);
  };

  function hvFaqHint() {
    const wrap = $('#faq .container');
    const title = wrap && $('h2', wrap);
    if (!title || !$('#ablauf')) return;
    const hint = deco(h('mx-hint'));
    wrap.append(hint);
    scene({
      host: hint, trigger: title, time: 2.2, skip: 0.5,
      make() {
        hint.append(
          h('mx-hint-bot', build(h('mx-helper-in', act(botImg('violet'), 'hop', 0.55)), 'pop', 0.05)),
          bubble('Ihre Mitarbeiterin entscheidet.', 0.55));
        title.addEventListener('pointerenter', (e) => {
          const spec = hosts.get(hint);
          if (e.pointerType === 'mouse' && fine.matches && spec.played && !still() && !reduce.matches && performance.now() > spec.busy) run(spec, 'mx-replay');
        });
        return () => {
          const pad = parseFloat(getComputedStyle(wrap).paddingLeft);
          const width = textWidth(title);
          const beside = wrap.clientWidth - 2 * pad - width >= 360;
          hint.style.left = `${beside ? pad + width + 28 : pad}px`;
          hint.style.top = `${beside ? title.offsetTop + title.offsetHeight / 2 - 9 : title.offsetTop - 42}px`;
        };
      },
    });
  }

  /* ════ Hausverwaltung, am Ende: Entwurf geht zur Mitarbeiterin, sie gibt frei ════ */
  function hvApproval() {
    const card = $('.hv-pilot');
    if (!card) return;
    scene({
      host: card, time: 3.9, skip: 0.5, hover: true,
      make() {
        const from = h('mx-from', build(h('mx-helper-in', act(botImg('violet'), 'hop', 0.55)), 'rise', 0.1));
        const check = act(h('mx-check-in', build(h('mx-check-dot'), 'pop', 2.3)), 'bump', 2.3);
        const human = h('mx-to', build(h('mx-to-in', act(h('mx-human'), 'nod', 1.95)), 'pop', 0.3),
          h('mx-check', check), act(h('mx-halo mx-halo--ok'), 'halo', 2.4));
        const doc = act(h('mx-doc', h('mx-doc-line'), h('mx-doc-line'), h('mx-doc-line')), 'fly', 0.8);
        const say = bubble('Ihre Mitarbeiterin prüft und gibt frei.', 2.45);
        const layer = deco(h('mx-approve', from, human, doc, say));
        card.append(layer);
        const marker = $('.marker', card);
        const title = $('h2', card);
        const body = $('p', card);
        return () => {
          const W = card.clientWidth;
          const H = card.clientHeight;
          const side = (W - Math.max(textWidth(title), textWidth(body))) / 2;
          const wide = side >= 184;
          layer.classList.toggle('mx-approve--strip', !wide);
          const top = marker.offsetTop;
          const size = wide ? 84 : Math.max(28, Math.min(40, top - 10));
          const botH = (size * 8) / 7;
          const face = wide ? 56 : Math.round(size * 0.82);
          const bx = wide ? side / 2 - size / 2 : 14;
          const by = wide ? H / 2 - botH / 2 : (top - botH) / 2;
          const hx = wide ? W - side / 2 - face / 2 : W - face - 20;
          const hy = wide ? H / 2 - face - 6 : (top - face) / 2;
          Object.assign(from.style, { left: `${bx}px`, top: `${by}px`, width: `${size}px` });
          Object.assign(human.style, { left: `${hx}px`, top: `${hy}px`, width: `${face}px`, height: `${face}px` });
          Object.assign(say.style, { left: `${hx + face / 2}px`, top: `${hy + face + 18}px`, width: `${Math.min(196, side - 12)}px` });
          const dw = doc.offsetWidth || 22;
          const dh = doc.offsetHeight || 28;
          const x0 = bx + size - 6;
          const x6 = hx - dw + 6;
          /* breit: Bogen über den Text; schmal: flach über der Zeile "Pilot" */
          const y0 = wide ? by + 4 : (top - dh) / 2;
          const y6 = wide ? hy + 8 : (top - dh) / 2;
          const high = wide ? 20 : Math.max(2, (top - dh) / 2 - 6);
          const lerp = (t) => x0 + (x6 - x0) * t;
          route(doc, [[x0, y0], [Math.min(lerp(0.12), side - dw - 6), wide ? (y0 + high) / 2 - 10 : high], [lerp(0.3), high], [lerp(0.5), high - (wide ? 4 : 0)], [lerp(0.7), high], [Math.max(lerp(0.88), W - side + 6), wide ? (y6 + high) / 2 - 10 : high], [x6, y6]]);
        };
      },
    });
  }

  /* ════ Begleiter an Übergängen: höchstens zwei je Seite, in der leeren Abschnittsluft ════ */
  function companions() {
    if (!window.matchMedia('(min-width: 761px)').matches) return;
    const spots = $('#ablauf') ? ['#abgrenzung', '#sicherheit'] : ['#services', '#member'];
    spots.forEach((sel) => {
      const section = $(sel);
      if (!section) return;
      const pal = deco(h('mx-pal'));
      /* Der Auslöser braucht schon vor dem Stylesheet eine Lage, ohne den Fluss zu ändern */
      Object.assign(pal.style, { position: 'absolute', top: '24px', right: '24px', width: '72px', height: '94px', pointerEvents: 'none' });
      section.append(pal);
      scene({
        host: pal, time: 3,
        make() {
          const img = document.createElement('img');
          img.src = asset('img/avatar-200.webp');
          img.width = 200; img.height = 261; img.alt = ''; img.decoding = 'async';
          pal.append(build(h('mx-pal-in', act(h('mx-pal-look', img), 'look', 0.85)), 'peek', 0));
          return () => {
            const pad = parseFloat(getComputedStyle(section).paddingTop);
            const side = parseFloat(getComputedStyle(section.firstElementChild.matches('.container') ? section.firstElementChild : $('.container', section)).paddingLeft);
            pal.style.top = `${Math.max(8, (pad - 94) / 2)}px`;
            pal.style.right = `${Math.max(side, (section.clientWidth - 1200) / 2 + side)}px`;
          };
        },
      });
    });
  }

  /* ════ Hover-Tiefe: Licht folgt dem Zeiger, Ebenen verschieben sich leicht ════ */
  function depth() {
    if (!fine.matches || reduce.matches) return;
    const cards = '#services .cap-tile, #plattform .pcard:not(.infra), .hv-step, .hv-point, .hv-card';
    const layers = [['.cap-bot', -7], ['.mx-panel', 5], [':scope > .pcard-visual > svg', 5], [':scope > .pcard-visual > .inbox', 4], ['.hv-bot', -5], ['.mx-helper', -4]];
    $$(cards).forEach((card) => {
      let parts;
      let glow;
      let frame = 0;
      let at;
      const apply = () => {
        frame = 0;
        const r = card.getBoundingClientRect();
        const x = at[0] - r.left;
        const y = at[1] - r.top;
        if (glow) glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        parts.forEach(([node, amount]) => { node.style.translate = `${((x / r.width - 0.5) * amount).toFixed(1)}px ${((y / r.height - 0.5) * amount).toFixed(1)}px`; });
      };
      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || still() || reduce.matches) return;
        loadStyles().then(() => {
          if (!parts && !card.classList.contains('cap-tile')) { glow = deco(h('mx-glow')); card.append(glow); }
          parts = layers.flatMap(([sel, amount]) => $$(sel, card).map((node) => { node.classList.add('mx-depth'); return [node, amount]; }));
          card.classList.add('mx-hover');
        }, () => {});
      });
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !parts || still() || reduce.matches) return;
        at = [e.clientX, e.clientY];
        card.classList.add('mx-hover');
        if (!frame) frame = requestAnimationFrame(apply);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('mx-hover');
        if (parts) parts.forEach(([node]) => { node.style.translate = ''; });
      });
    });
  }

  /* Pause: was noch nicht lief oder außerhalb des Bildes läuft, zeigt das Endbild statt eines Zwischenstands */
  function settle() {
    hosts.forEach((spec) => {
      const { classList } = spec.host;
      if (classList.contains('mx-arm')) {
        classList.remove('mx-arm');
        spec.played = true;
        player.unobserve(spec.trigger);
      } else if (classList.contains('mx-off')) classList.remove('mx-play', 'mx-replay');
    });
  }

  function start() {
    player = new IntersectionObserver((entries) => {
      let n = 0;
      entries.filter(visibleEnough).forEach((entry) => {
        const spec = scenes.get(entry.target);
        if (!spec || spec.played) return;
        spec.played = true;
        player.unobserve(entry.target);
        run(spec, spec.seen ? 'mx-replay' : 'mx-play', spec.stagger * Math.min(n, 4));
        n += 1;
      });
    }, { threshold: [0, 0.15, 0.3, 0.42, 0.55, 0.7, 0.85, 1] });
    watcher = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('mx-off', !e.isIntersecting));
    });
    /* Lage neu rechnen, wenn sich Fenster oder Karte ändern (einmal je Bild) */
    let queued = 0;
    const relayout = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        hosts.forEach((spec) => { if (spec.layout) spec.layout(); });
      });
    };
    resizer = new ResizeObserver(relayout);
    window.addEventListener('resize', relayout, { passive: true });

    const hidden = () => root.classList.toggle('mx-hidden', document.hidden);
    document.addEventListener('visibilitychange', hidden);
    hidden();
    new MutationObserver(() => { if (still()) { settle(); $$('.mx-hover').forEach((n) => n.classList.remove('mx-hover')); $$('.mx-depth').forEach((n) => { n.style.translate = ''; }); } })
      .observe(root, { attributes: true, attributeFilter: ['class'] });
    reduce.addEventListener('change', () => {
      if (!reduce.matches) return;
      hosts.forEach((spec) => spec.host.classList.remove('mx-arm', 'mx-play', 'mx-replay', 'mx-fresh', 'mx-hover'));
      $$('.mx-depth').forEach((n) => { n.style.translate = ''; });
    });

    capScenes();
    terminal();
    organisation();
    productCards();
    filmSteps();
    hvSteps();
    hvPoints();
    hvFaqHint();
    hvApproval();
    companions();
    depth();
  }

  if (!('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
