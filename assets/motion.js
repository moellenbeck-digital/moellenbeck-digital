/* Mikro-Szenen. Wenige, ruhige Bilder zu dem, was der Abschnitt schon sagt (DESIGN.md §10).
   main.js holt diese Datei nach "load" beim ersten Scrollen oder Zeigen (sonst nach 5 s); sie lädt motion.css
   und baut jede Szene erst nahe am Viewport.
   Regeln: Seitentext wird nie ausgeblendet, nur Dekoration. Jede Szene läuft höchstens einmal.
   Grundzustand = Endbild: .mx-arm hält den Aufbau (.mx-b) bis zum Lauf zurück, .mx-play spielt Aufbau und
   Handlung (.mx-a). Pause, "Bewegung reduzieren" und Druck zeigen sofort das Endbild.
   Welche Karte welches Bild bekommt, steht als data-mx im HTML; ohne Angabe entsteht nichts. */
(() => {
  const root = document.documentElement;
  const base = document.currentScript.src;
  const asset = (path) => new URL(path, base).href;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => root.classList.contains('md-still');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  /* Pflichtteil einer Szene: fehlt er, meldet die Konsole die Szene statt still falsch zu zeichnen */
  const need = (sel, ctx = document) => {
    const node = $(sel, ctx);
    if (!node) throw new Error(`missing ${sel}`);
    return node;
  };
  const part = (name, ctx) => need(`[data-mx="${name}"]`, ctx);
  const MIN_TEXT = 11.2; /* gerenderte Mindestgröße der Szenentexte in px */

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

  /* Aufbau (.mx-b) und Handlung (.mx-a), je einmal. Ein Element trägt nur eines von beidem. */
  const build = (node, kind, delay = 0) => {
    node.classList.add('mx-b', `mx-b-${kind}`);
    node.style.setProperty('--d', `${delay}s`);
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
  /* Sieben Punkte auf einer kubischen Kurve, an den Enden langsamer (gerechnet, ohne SVG-Messung) */
  const curve = (p0, p1, p2, p3) => [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const x = i / 6;
    const t = x * x * (3 - 2 * x);
    const u = 1 - t;
    return [0, 1].map((a) => u * u * u * p0[a] + 3 * u * u * t * p1[a] + 3 * u * t * t * p2[a] + t * t * t * p3[a]);
  });
  const traveller = (points, delay, r = 3) => act(route(dot(0, 0, r, 'mx-token'), points), 'travel', delay);

  /* ── Motor ── */
  let styles;
  const loadStyles = () => {
    styles = styles || new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = asset('motion.css');
      link.addEventListener('load', resolve);
      link.addEventListener('error', () => reject(new Error('motion.css not loaded')));
      document.head.append(link);
    });
    return styles;
  };

  const waiting = new Map(); /* Auslöser -> Szene, die noch nicht lief */
  const built = new Set();
  let player;
  let watcher;
  let resizer;

  const visibleEnough = (entry) => entry.isIntersecting
    && (entry.intersectionRatio >= 0.42 || entry.intersectionRect.height >= window.innerHeight * 0.4);

  /* Endbild: nichts wartet, nichts läuft, nichts spielt später noch einmal */
  function finish(spec) {
    spec.host.classList.remove('mx-arm', 'mx-play', 'mx-fresh');
    player.unobserve(spec.trigger);
    waiting.delete(spec.trigger);
  }

  /* host: Element mit der Szene · trigger: was sichtbar sein muss · make: baut die Dekoration, liefert optional layout()
     stagger: Versatz je gleichzeitig sichtbarer Szene */
  function scene({ host, trigger = host, make, stagger = 0 }) {
    if (!host || !trigger) return;
    const spec = { host, trigger, stagger };
    const near = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      near.disconnect();
      loadStyles().then(() => {
        spec.layout = make(host) || null;
        host.classList.add('mx');
        built.add(spec);
        if (spec.layout) { spec.layout(); resizer.observe(host); }
        watcher.observe(host);
        if (reduce.matches || still()) return;
        const r = trigger.getBoundingClientRect();
        /* Schon im Bild: nichts zurückhalten, die neue Dekoration blendet sanft ein */
        if (r.top < window.innerHeight && r.bottom > 0) { host.classList.add('mx-fresh'); return; }
        host.classList.add('mx-arm');
        waiting.set(trigger, spec);
        player.observe(trigger);
      }).catch((error) => console.warn('motion:', error.message));
    }, { rootMargin: '700px 0px' });
    near.observe(trigger);
  }

  /* ════ Fähigkeiten: jede Kachel zeigt eine Handlung zu ihrem eigenen Inhalt ════ */
  const capPanels = {
    connect(svg) { /* Wissen und Werkzeuge verbinden */
      const a = [[40, 23], [96, 23], [108, 50], [168, 50]];
      const b = [[40, 77], [96, 77], [108, 62], [168, 62]];
      const path = ([p0, p1, p2, p3]) => `M${p0}C${p1} ${p2} ${p3}`;
      const paper = g(box(8, 7, 32, 32, 8), line('M17 17h14M17 23h14M17 29h9', 'mx-ink'));
      const tool = g(box(8, 61, 32, 32, 8), line('M18 85l9-9M26 69a7 7 0 1 0 8 8l-4 1l-3-3l1-4a7 7 0 0 0-2-2z', 'mx-ink'));
      const hub = g(dot(188, 56, 20, 'mx-hub'), line('M180 50l7 6l-7 6M190 63h8', 'mx-ink mx-ink--tone'));
      svg.append(
        build(paper, 'pop', 0.15), build(label(8, 52, 'Wissen'), 'fade', 0.35),
        build(tool, 'pop', 0.3), build(label(8, 108, 'Werkzeuge'), 'fade', 0.5),
        build(line(path(a)), 'fade', 0.55), build(line(path(b)), 'fade', 0.7),
        build(hub, 'pop', 0.95),
        traveller(curve(...a), 1.25), traveller(curve(...b), 1.45),
        act(dot(188, 56, 20, 'mx-ring'), 'ring', 2.05),
      );
    },
    process(svg) { /* BPMN-Ablauf mit Prüfung und Freigabe */
      svg.append(
        build(dot(14, 48, 9, 'mx-box'), 'pop', 0.1),
        build(line('M23 48H40'), 'fade', 0.25),
        build(g(box(40, 30, 62, 36, 7), line('M50 41h30M50 55h20', 'mx-ink')), 'pop', 0.4),
        build(label(71, 89, 'Prüfung', 'middle'), 'fade', 0.55),
        build(line('M102 48H118'), 'fade', 0.6),
        build(g(s('path', { d: 'M132 34l14 14l-14 14l-14-14z', class: 'mx-box' }), line('M132 42v12M126 48h12', 'mx-ink')), 'pop', 0.75),
        build(line('M146 48H172'), 'fade', 0.9),
        build(dot(190, 48, 18, 'mx-box mx-box--end'), 'pop', 1.05),
        build(label(184, 89, 'Freigabe', 'middle'), 'fade', 1.15),
        traveller([[14, 48], [32, 48], [54, 66], [88, 66], [118, 52], [150, 48], [172, 48]], 1.35),
        act(g(build(g(dot(98, 33, 8, 'mx-badge'), tick(98, 33, 'mx-tick mx-tick--ink')), 'pop', 1.95)), 'bump', 1.95),
        act(g(build(g(dot(190, 48, 11, 'mx-ok'), tick(190, 48, 'mx-tick mx-tick--ok')), 'pop', 2.65)), 'bump', 2.65),
        act(dot(190, 48, 18, 'mx-ring mx-ring--ok'), 'ring', 2.75),
      );
    },
    web(svg) { /* Web & Apps: Oberfläche entsteht, bis ins Deployment */
      const piece = (x, y, w, ht, delay, cls = 'mx-bar') => act(g(build(box(x, y, w, ht, 3, cls), 'slide', delay)), 'lift', delay + 1.25);
      svg.append(
        build(g(box(8, 4, 150, 84, 7), line('M8 18H158', 'mx-line mx-line--soft'), dot(17, 11, 2, 'mx-dim'), dot(24, 11, 2, 'mx-dim'), dot(31, 11, 2, 'mx-dim')), 'pop', 0.1),
        build(box(172, 8, 40, 76, 9), 'pop', 0.25),
        piece(17, 26, 78, 8, 0.45, 'mx-fill'), piece(17, 40, 120, 5, 0.55),
        piece(17, 52, 62, 27, 0.7), piece(87, 52, 62, 27, 0.8),
        piece(178, 18, 28, 6, 0.95, 'mx-fill'), piece(178, 29, 28, 28, 1.05), piece(178, 62, 28, 6, 1.15),
        build(label(8, 108, 'Deployment'), 'fade', 1.25),
        build(box(118, 102, 74, 4, 2, 'mx-bar'), 'fade', 1.25),
        build(box(118, 102, 74, 4, 2, 'mx-fill'), 'grow', 1.4),
        act(g(build(g(dot(205, 104, 8, 'mx-badge'), tick(205, 104, 'mx-tick mx-tick--ink')), 'pop', 2.35)), 'bump', 2.35),
      );
    },
    host(svg) { /* selbst gehostet, Daten unter eigener Kontrolle */
      [0, 1, 2].forEach((i) => {
        const y = 6 + i * 31;
        svg.append(build(g(box(10, y, 124, 25, 6), line(`M54 ${y + 9}h66M54 ${y + 16}h44`, 'mx-ink')), 'slide', 0.15 + i * 0.18),
          dot(23, y + 12.5, 3, 'mx-dim'), dot(35, y + 12.5, 3, 'mx-dim'),
          act(g(build(dot(23, y + 12.5, 3), 'pop', 0.8 + i * 0.22)), 'blink', 1.7 + i * 0.18),
          act(g(build(dot(35, y + 12.5, 3, 'mx-fill mx-fill--soft'), 'pop', 0.9 + i * 0.22)), 'blink', 1.82 + i * 0.18));
      });
      svg.append(
        build(line('M134 50H170'), 'fade', 1.35),
        build(box(170, 47, 42, 33, 7), 'pop', 1.5),
        build(line('M179 47V37a12 12 0 0 1 24 0v10', 'mx-shackle'), 'shackle', 1.9),
        build(g(dot(191, 61, 3.5), line('M191 62v8', 'mx-line mx-line--tone')), 'fade', 2.2),
        build(label(10, 110, 'selbst gehostet'), 'fade', 1.4),
        traveller([[134, 50], [140, 50], [146, 50], [152, 50], [158, 50], [164, 50], [170, 50]], 2.35),
      );
    },
  };

  /* Zeichenfeld mit Beschriftung: Schrift bleibt gerendert MIN_TEXT groß; wird das Feld dafür zu klein, entfällt es ganz */
  const MIN_SCALE = 0.66;
  const scaleOf = (width, height, viewWidth, viewHeight) => Math.min(width / viewWidth, height / viewHeight);
  const fitPanel = (svg, scale) => {
    const fits = scale >= MIN_SCALE;
    svg.style.display = fits ? '' : 'none';
    if (fits) svg.style.setProperty('--fs', `${(MIN_TEXT / scale).toFixed(2)}px`);
    return fits;
  };

  /* Platz zwischen Kartenkante und Nummer, links neben dem Bot */
  function capBox(tile) {
    const bot = need('.cap-bot', tile);
    const num = need('.cap-num', tile);
    const left = num.offsetLeft;
    const top = 16;
    const width = Math.min(292, bot.offsetLeft + bot.offsetWidth * 0.19 - left);
    const height = Math.min(152, num.offsetTop - top - 8);
    return { left, top, width, height, scale: scaleOf(width, height, 216, 114) };
  }

  function capScenes() {
    const tiles = $$('#services .cap-tile[data-mx]');
    tiles.forEach((tile) => {
      const draw = capPanels[tile.dataset.mx];
      if (!draw) return;
      scene({
        host: tile, stagger: 0.16,
        make() {
          const svg = deco(s('svg', { viewBox: '0 0 216 114', class: 'mx-panel', preserveAspectRatio: 'xMinYMid meet', focusable: 'false' }));
          draw(svg);
          tile.append(svg);
          return () => {
            /* alle Kacheln oder keine: sonst wirkt eine Kachel ohne Bild wie ein Fehler */
            const own = capBox(tile);
            const scale = Math.min(...tiles.map((t) => capBox(t).scale));
            if (!fitPanel(svg, scale >= MIN_SCALE ? own.scale : scale)) return;
            const { left, top, width, height } = own;
            Object.assign(svg.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
          };
        },
      });
    });
  }

  /* ════ Plattform: nur, was die Karte schon zeigt ════ */
  /* Terminal: ein Hinweis auf die Freigabe */
  function terminal() {
    const term = $('#plattform .pcard--anchor .term');
    if (!term) return;
    scene({ host: term, make() { need('.term-btn', term).append(act(deco(h('mx-halo')), 'halo', 0.35)); } });
  }

  const seal = (cls, fill, ink) => s('svg', { viewBox: '0 0 16 16', class: cls, focusable: 'false' }, dot(8, 8, 8, fill), tick(7.6, 8, ink));

  /* Organisation: Aufgaben gehen ins Team, zwei prüfen */
  function organisation() {
    const org = $('#plattform .org');
    if (!org) return;
    scene({
      host: org,
      make() {
        const [, chief, ...team] = $$('.org-node', org);
        const bar = need('.org-team', org);
        if (team.length < 3) throw new Error('missing .org-node');
        const dots = team.map((node, i) => {
          const d = act(deco(h('mx-pip')), 'travel', 0.2 + i * 0.12);
          d.style.setProperty('--c', node.style.getPropertyValue('--t'));
          org.append(d);
          return d;
        });
        /* Tester und Reviewer prüfen unabhängig; neutral, denn Prüfen ist noch keine Freigabe */
        [team[1], team[2]].forEach((node, i) => node.append(build(deco(h('mx-check', seal('mx-seal', 'mx-seal-neutral', 'mx-tick mx-tick--ink'))), 'pop', 1.45 + i * 0.2)));
        /* Lage im Diagramm aus offset-Werten: unabhängig von laufenden Transforms */
        const within = (node) => {
          let x = 0;
          let y = 0;
          for (let n = node; n && n !== org; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
          return [x + node.offsetWidth / 2, y, node.offsetHeight];
        };
        return () => {
          const [cx, ly, lh] = within($('.org-l', chief));
          const line7 = within(bar)[1] - 7;
          dots.forEach((d, i) => {
            const [tx, ty, th] = within($('img', team[i]));
            const end = ty + th * 0.2;
            /* Weg unter der Beschriftung los, über die Verteil-Linie zum Agenten */
            route(d, [[cx, ly + lh + 2], [cx, line7], [cx + (tx - cx) * 0.33, line7], [cx + (tx - cx) * 0.66, line7], [tx, line7], [tx, (line7 + end) / 2], [tx, end]]);
          });
        };
      },
    });
  }

  /* Die Bilder der Produktkarten stehen im HTML. Bewegt werden nur Formen und Marken, nie ihr Text ausgeblendet. */
  const visuals = {
    process(visual) { /* Prozessmodell baut sich auf, dann ein Lauf bis zum Menschen */
      const svg = need(':scope > svg', visual);
      const [link, start, wires, task, gate, ask, human] = ['link', 'start', 'wires', 'task', 'gate', 'ask', 'human'].map((n) => part(n, svg));
      [link, start, wires, task, gate, ask, human].forEach((node, i) => build(node, 'art', 0.1 + i * 0.12));
      const num = (node, name) => Number(node.getAttribute(name));
      const gateBox = gate.getBBox();
      const low = num(task, 'y') + num(task, 'height');
      const mid = num(human, 'y') + num(human, 'height') / 2;
      const branch = num(human, 'x') - 14;
      svg.append(deco(traveller([
        [num(start, 'cx'), num(start, 'cy')], [num(task, 'x'), low], [num(task, 'x') + num(task, 'width') / 2, low], [num(task, 'x') + num(task, 'width'), low],
        [gateBox.x + gateBox.width / 2, gateBox.y + gateBox.height], [branch, mid], [num(human, 'x'), mid],
      ], 1.25, 3.5)));
    },
    bloom(visual) { /* Knoten wachsen; der versteckte Knoten (#bloomLeaf) bleibt unberührt */
      const svg = need(':scope > svg', visual);
      build(part('root', svg), 'art', 0.1);
      const all = (name, count) => {
        const nodes = $$(`[data-mx="${name}"]`, svg);
        if (nodes.length !== count) throw new Error(`missing [data-mx="${name}"]`);
        return nodes;
      };
      all('branch', 3).forEach((node, i) => build(node, 'art', 0.35 + i * 0.25));
      all('node', 3).forEach((node, i) => build(node, 'art', 0.5 + i * 0.25));
      all('twig', 2).forEach((node, i) => build(node, 'art', 1.3 + i * 0.15));
      build(part('leaf', svg), 'art', 1.5);
    },
    mesh(visual) { /* Direkte Verbindungen leuchten einmal auf; zum Koordinationsserver läuft nichts */
      const svg = need(':scope > svg', visual);
      const nodes = need('.mesh-nodes', svg);
      const at = (name) => { const c = part(name, nodes); return [c.getAttribute('cx'), c.getAttribute('cy')]; };
      const lit = deco(g(...[['laptop', 'server'], ['server', 'cluster'], ['cluster', 'nas']]
        .map(([a, b], i) => act(line(`M${at(a)}L${at(b)}`, 'mx-line mx-line--lit'), 'glow', 0.2 + i * 0.35))));
      nodes.before(lit);
      nodes.after(deco(g(...[['laptop', 0.2], ['server', 0.35], ['cluster', 0.7], ['nas', 1.05]]
        .map(([name, delay]) => act(dot(...at(name), 11, 'mx-node'), 'glow', delay)))));
    },
    inbox(visual) { /* Marken setzen sich nacheinander */
      const marks = $$('.inbox-row .tag, .inbox-row .mut', visual);
      if (!marks.length) throw new Error('missing .inbox-row mark');
      marks.forEach((mark, i) => build(mark, 'nudge', 0.2 + i * 0.4));
    },
  };

  function productCards() {
    $$('#plattform .pcard-visual[data-mx]').forEach((visual) => {
      const make = visuals[visual.dataset.mx];
      if (make) scene({ host: visual, make: () => make(visual), stagger: 0.25 });
    });
  }

  /* ════ Hausverwaltung: Ablauf, ein Bild je Schritt ════ */
  const stepPanels = {
    intake(svg) { /* Eingang: Objekt, Einheit, Dringlichkeit */
      svg.append(act(g(build(g(box(0, 30, 28, 22, 4), line('M1 33l13 11l13-11', 'mx-ink mx-ink--tone')), 'enter', 0.25)), 'bump', 0.45));
      ['Objekt', 'Einheit', 'Dringlichkeit'].forEach((name, i) => {
        const y = 18 + i * 23;
        svg.append(build(label(43, y + 4, name), 'slide', 0.5 + i * 0.2),
          act(g(build(tick(35, y), 'pop', 0.65 + i * 0.2)), 'bump', 0.65 + i * 0.2));
      });
    },
    drafts(svg) { /* Entwürfe mit Quelle: drei Blätter fächern sich auf, dann füllt sich das vorderste */
      [18, 40, 62].forEach((x, i) => {
        const sheet = build(g(box(x, 4 + i * 4, 40, 50, 5, 'mx-box mx-box--sheet')), 'fan', 0.2 + i * 0.1);
        sheet.style.setProperty('--fx', `${(1 - i) * 18}px`);
        svg.append(sheet);
      });
      [0, 1, 2, 3].forEach((i) => svg.append(build(box(69, 21 + i * 8, i === 3 ? 17 : 26, 2.5, 1, 'mx-fill mx-fill--soft'), 'grow', 0.65 + i * 0.15)));
      svg.append(act(g(build(g(box(58, 62, 68, 21, 6, 'mx-chip'), label(92, 76.5, 'Quelle', 'middle')), 'pop', 1.35)), 'bump', 1.35));
    },
    approve(svg) { /* Freigabe der Mitarbeiterin: Marke (kein Knopf) mit Haken */
      svg.append(
        build(g(box(10, 29, 90, 30, 6, 'mx-chip mx-chip--outline'), label(55, 48, 'Freigabe', 'middle')), 'pop', 0.25),
        act(g(build(g(dot(116, 44, 11, 'mx-ok'), tick(116, 44, 'mx-tick mx-tick--ok')), 'pop', 0.95)), 'bump', 0.95),
        act(dot(116, 44, 11, 'mx-ring mx-ring--ok'), 'ring', 1.1),
      );
    },
    record(svg) { /* Vorgangsakte: Freigaben und Versionen */
      svg.append(act(g(build(g(s('path', { d: 'M1 24h11l4 5h17v30H1z', class: 'mx-box' }), line('M8 40h19M8 47h13', 'mx-ink')), 'enter', 0.2)), 'bump', 0.4),
        build(label(43, 22, 'Akte'), 'fade', 0.35));
      ['Freigaben', 'Versionen'].forEach((name, i) => {
        const y = 43 + i * 23;
        svg.append(build(label(54, y + 4, name), 'slide', 0.6 + i * 0.25),
          act(g(build(tick(45, y), 'pop', 0.75 + i * 0.25)), 'bump', 0.75 + i * 0.25));
      });
    },
  };

  function hvSteps() {
    $$('#ablauf .hv-step[data-mx]').forEach((step) => {
      const draw = stepPanels[step.dataset.mx];
      if (!draw) return;
      scene({
        host: step, stagger: 0.2,
        make() {
          const svg = deco(s('svg', { viewBox: '0 0 134 84', class: 'mx-panel mx-panel--step', preserveAspectRatio: 'xMaxYMid meet', focusable: 'false' }));
          draw(svg);
          step.append(svg);
          /* Links steht die Figur der Karte, rechts bleibt Platz für das Bild */
          return () => {
            const width = Math.min(220, step.clientWidth - 122 - 6);
            if (fitPanel(svg, scaleOf(width, 96, 134, 84))) svg.style.width = `${width}px`;
          };
        },
      });
    });
  }

  /* ════ Hausverwaltung: Vorteile – ein ruhiges Zeichen neben der Nummer ════ */
  const glyphs = {
    sorted: () => [line('M2 5h20M2 12h14M2 19h8', 'mx-line mx-line--tone')],
    everyone: () => [line('M3 12L21 4M3 12h18M3 12l18 8', 'mx-line mx-line--soft'), dot(3, 12, 3), dot(22, 4, 2.6), dot(22, 12, 2.6), dot(22, 20, 2.6)],
    alarm: () => [line('M5 17h14c-2-2-3-4-3-8a4 4 0 0 0-8 0c0 4-1 6-3 8zM10 20.5a2.5 2.5 0 0 0 4 0', 'mx-line mx-line--tone')],
    four: () => [0, 1].flatMap((p) => [
      s('rect', { x: 0.7, y: 3 + p * 10.5, width: 24, height: 8.6, rx: 4.3, class: 'mx-line mx-line--tone' }),
      dot(8.4, 7.3 + p * 10.5, 2), dot(17, 7.3 + p * 10.5, 2),
    ]),
    proof: () => [line('M5 2h10l5 5v15H5zM15 2v5h5', 'mx-line mx-line--tone'), tick(12, 15)],
  };

  function hvPoints() {
    $$('#nutzen .hv-point[data-mx]').forEach((point) => {
      const draw = glyphs[point.dataset.mx];
      if (!draw) return;
      scene({
        host: point, stagger: 0.08,
        make() {
          const num = need('.hv-num', point);
          const glyph = deco(s('svg', { viewBox: '0 0 26 24', class: 'mx-glyph', focusable: 'false' }, ...draw()));
          point.append(build(glyph, 'fade', 0.15));
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

  /* ════ Hausverwaltung, am Ende: ein Dokument, dann der Haken der Freigabe ════ */
  function hvApproval() {
    const card = $('.hv-pilot');
    if (!card) return;
    scene({
      host: card,
      make() {
        const texts = [need('.marker', card), need('h2', card), need('p', card)];
        const doc = h('mx-doc', h('mx-doc-line'), h('mx-doc-line'), h('mx-doc-line'));
        const layer = deco(h('mx-approve',
          build(doc, 'enter', 0.2),
          act(h('mx-doc-seal', build(h('mx-doc-seal-in', seal('mx-seal', 'mx-ok', 'mx-tick mx-tick--ok')), 'pop', 0.9)), 'bump', 0.9),
          act(h('mx-halo mx-halo--ok'), 'halo', 1.05)));
        card.append(layer);
        return () => {
          const W = card.clientWidth;
          const [marker, title, body] = texts;
          /* breit: rechts neben Titel und Text · schmal: oben rechts neben der Zeile "Pilot" · sonst gar nicht */
          const side = (W - Math.max(textWidth(title), textWidth(body))) / 2;
          const wide = side >= 120;
          const corner = (W - textWidth(marker)) / 2;
          const room = title.offsetTop - 22;
          layer.classList.toggle('mx-approve--small', !wide);
          layer.style.display = wide || (corner >= 56 && room >= 34) ? '' : 'none';
          const width = wide ? 52 : 26;
          const height = wide ? 64 : 32;
          Object.assign(layer.style, {
            width: `${width}px`, height: `${height}px`,
            left: `${wide ? W - side / 2 - width / 2 : W - width - 22}px`,
            top: `${wide ? (card.clientHeight - height) / 2 : 14}px`,
          });
        };
      },
    });
  }

  /* ════ Ein Begleiter je Seite, nur Desktop: lugt über die Kante einer Karte, neben der Überschrift ════ */
  function companion() {
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    const grid = $('#sicherheit .hv-compare') || $('#plattform .bento');
    if (!grid) return;
    const peek = deco(h('mx-peek'));
    /* Der Auslöser braucht schon vor dem Stylesheet eine Lage, ohne den Fluss zu ändern */
    grid.style.position = 'relative';
    Object.assign(peek.style, { position: 'absolute', bottom: '100%', right: '48px', width: '80px', height: '56px', pointerEvents: 'none' });
    grid.append(peek);
    scene({
      host: peek,
      make() {
        const img = document.createElement('img');
        img.src = asset('img/avatar-200.webp');
        img.width = 200; img.height = 261; img.alt = ''; img.decoding = 'async';
        peek.append(build(img, 'peek', 0.5));
        const head = need('.section-head', grid.closest('section'));
        return () => {
          if (window.innerWidth < 1024) { peek.style.display = 'none'; return; }
          /* Abstand jeder Textzeile zum Kartenrand aus offset-Werten (gilt auch, solange die Überschrift noch einblendet) */
          const gap = grid.offsetTop - head.offsetTop - head.offsetHeight;
          const frame = head.getBoundingClientRect();
          const left = grid.getBoundingClientRect().right - 48 - 80;
          const range = document.createRange();
          const crowded = [...head.children].some((node) => {
            range.selectNodeContents(node);
            return [...range.getClientRects()].some((r) => r.width > 1 && r.right > left - 16 && gap + frame.bottom - r.bottom < 56 + 4);
          });
          peek.style.display = crowded ? 'none' : '';
        };
      },
    });
  }

  function start() {
    player = new IntersectionObserver((entries) => {
      let n = 0;
      entries.filter(visibleEnough).forEach((entry) => {
        const spec = waiting.get(entry.target);
        if (!spec) return;
        waiting.delete(entry.target);
        player.unobserve(entry.target);
        spec.host.style.setProperty('--s', `${spec.stagger * Math.min(n, 4)}s`);
        spec.host.classList.replace('mx-arm', 'mx-play');
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
        built.forEach((spec) => { if (spec.layout) spec.layout(); });
      });
    };
    resizer = new ResizeObserver(relayout);
    window.addEventListener('resize', relayout, { passive: true });

    const hidden = () => root.classList.toggle('mx-hidden', document.hidden);
    document.addEventListener('visibilitychange', hidden);
    hidden();
    /* Pause, "Bewegung reduzieren" und Druck: sofort überall das Endbild */
    const settle = () => built.forEach(finish);
    new MutationObserver(() => { if (still()) settle(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
    reduce.addEventListener('change', () => { if (reduce.matches) settle(); });
    window.addEventListener('beforeprint', settle);

    capScenes();
    terminal();
    organisation();
    productCards();
    hvSteps();
    hvPoints();
    hvApproval();
    companion();
  }

  if (!('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
