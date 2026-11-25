// Lokale Prüfung der Ratgeber-Entwürfe. Aufruf siehe README.md.
// BASE_URL    Server auf dem Checkout   (Standard: http://127.0.0.1:8897)
// TOOLS_DIR   node_modules mit playwright und @axe-core/playwright (Standard: audit/tools/node_modules)
// CHROME_PATH Chrome-Binary             (Standard: Google Chrome unter macOS)
// OUT_DIR     Ziel für Ergebnisse       (Standard: Ordner dieses Skripts)
// SHOT_DIR    optional: Einzel-Screenshots je Entwurf und Breite
const fs = require('fs');
const path = require('path');
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8897').replace(/\/$/, '');
const TOOLS = path.resolve(process.env.TOOLS_DIR || path.join(__dirname, '../../../audit/tools/node_modules'));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve(process.env.OUT_DIR || __dirname);
const SHOTS = process.env.SHOT_DIR && path.resolve(process.env.SHOT_DIR);
const { chromium } = require(path.join(TOOLS, 'playwright'));
const { AxeBuilder } = require(path.join(TOOLS, '@axe-core/playwright'));

const CORE = ['/', '/hausverwaltung/', '/impressum.html', '/datenschutz.html', '/legal/'];
const DRAFTS = ['/hausverwaltung/ratgeber/schadensmeldungen/', '/hausverwaltung/ratgeber/verwaltungssoftware/', '/ratgeber/prozessautomatisierung/'];
const WIDTHS = [320, 360, 375, 390, 412];
const NOTICE = 'Pilotphase startet bald.';
// Erste Aussage zum KI-Mitarbeiter: der Hinweis muss davor stehen.
const FIRST_CLAIM = {
  [DRAFTS[0]]: 'Der KI-Mitarbeiter liest',
  [DRAFTS[1]]: 'Das Angebot für Hausverwaltungen ersetzt',
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const failures = [];

  // 1. Axe, Links, Anker und Ladefehler
  const pages = [];
  for (const route of [...CORE, ...DRAFTS]) {
    const context = await browser.newContext({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const failedRequests = [];
    page.on('response', r => { if (r.status() >= 400) failedRequests.push({ url: r.url().replace(BASE, ''), status: r.status() }); });
    await page.goto(BASE + route);
    await page.waitForTimeout(1000);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const refs = await page.locator('a[href], link[rel~="icon"], link[rel="apple-touch-icon"]').evaluateAll(es => es.map(e => e.href));
    const badLinks = [];
    for (const url of new Set(refs)) {
      if (!url.startsWith(BASE)) continue;
      const [file, hash] = url.split('#');
      const r = await page.request.get(file);
      if (!r.ok()) badLinks.push({ url: url.replace(BASE, ''), status: r.status() });
      else if (hash && DRAFTS.includes(route) && !new RegExp(`id=["']${hash}["']`).test(await r.text())) badLinks.push({ url: url.replace(BASE, ''), status: 'Anker fehlt' });
    }
    pages.push({ path: route, violations: axe.violations, badLinks, failedRequests });
    if (axe.violations.length || badLinks.length || failedRequests.length) failures.push(`${route}: Axe/Links/Requests`);
    await context.close();
  }

  // 2. H1 mobil: rechtes Textende <= Viewport. Bestandsseiten zum Vergleich.
  const h1 = [];
  const shots = [];
  for (const route of [...DRAFTS, '/', '/hausverwaltung/']) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(BASE + route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.querySelector('h1'), NodeFilter.SHOW_TEXT);
        let left = Infinity, right = 0, node;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of range.getClientRects()) { left = Math.min(left, r.left); right = Math.max(right, r.right); }
        }
        return { viewport: document.documentElement.clientWidth, textLeft: +left.toFixed(1), textRight: +right.toFixed(1) };
      });
      const ok = m.viewport === width && m.textLeft >= 0 && m.textRight <= width;
      h1.push({ path: route, width, ...m, ok });
      if (!ok) failures.push(`${route} @${width}: H1`);
      if (DRAFTS.includes(route)) {
        const image = await page.screenshot({ type: 'jpeg', quality: 70 });
        shots.push({ route, width, textRight: m.textRight, image });
        if (SHOTS) {
          fs.mkdirSync(SHOTS, { recursive: true });
          fs.writeFileSync(path.join(SHOTS, `${route.split('/').filter(Boolean).pop()}-${width}.jpg`), image);
        }
      }
      await context.close();
    }
  }

  // 3. Breadcrumb = Schema, aria-current, keine doppelten Ziele; Verfügbarkeitshinweis
  const content = [];
  for (const route of DRAFTS) {
    const page = await browser.newPage();
    await page.goto(BASE + route);
    const d = await page.evaluate(() => {
      const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph']
        .find(n => n['@type'] === 'BreadcrumbList').itemListElement
        .map(i => ({ name: i.name, path: new URL(i.item).pathname }));
      const visible = [...document.querySelectorAll('.breadcrumb li > *')]
        .map(e => ({ name: e.textContent.trim(), path: e.href ? new URL(e.href).pathname : location.pathname }));
      const current = [...document.querySelectorAll('.breadcrumb [aria-current="page"]')].map(e => e.textContent.trim());
      return { schema, visible, current, description: document.querySelector('meta[name="description"]').content, main: document.querySelector('main').innerText };
    });
    const breadcrumbEqual = JSON.stringify(d.schema) === JSON.stringify(d.visible);
    const currentOk = d.current.length === 1 && d.current[0] === d.visible.at(-1).name;
    const noDuplicate = new Set(d.visible.map(i => i.path)).size === d.visible.length;
    const result = { path: route, breadcrumb: d.visible.map(i => i.name), breadcrumbEqual, currentOk, noDuplicate };
    if (FIRST_CLAIM[route]) {
      const at = d.main.indexOf(NOTICE);
      result.noticeBeforeFirstClaim = at >= 0 && at < d.main.indexOf(FIRST_CLAIM[route]);
    }
    if (route === DRAFTS[0]) result.noticeInDescription = d.description.startsWith(NOTICE);
    if (Object.values(result).includes(false)) failures.push(`${route}: Breadcrumb/Hinweis`);
    content.push(result);
    await page.close();
  }

  // Kontaktbogen: alle Entwurfs-Screenshots in einem Bild
  const sheet = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await sheet.setContent('<body style="margin:0;background:#777;font:14px sans-serif">' + DRAFTS.map(route =>
    `<p style="margin:8px;color:#fff">${route}</p><div style="display:flex;gap:8px;padding:0 8px;align-items:flex-start">` +
    shots.filter(s => s.route === route).map(s =>
      `<figure style="margin:0;color:#fff">${s.width} px · H1-Textende ${s.textRight}<br><img width="${s.width * 0.6}" src="data:image/jpeg;base64,${s.image.toString('base64')}"></figure>`).join('') +
    '</div>').join('') + '</body>');
  await sheet.screenshot({ path: path.join(OUT, 'h1-mobil.jpg'), fullPage: true, type: 'jpeg', quality: 60 });
  await browser.close();

  fs.writeFileSync(path.join(OUT, 'browser-checks.json'), JSON.stringify(pages, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'h1-mobil.json'), JSON.stringify(h1, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'content-checks.json'), JSON.stringify(content, null, 2) + '\n');
  console.log(failures.length ? 'FAIL\n' + failures.join('\n') : `PASS: ${pages.length} Routen, ${h1.length} H1-Messungen, ${content.length} Entwürfe`);
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exit(1); });
