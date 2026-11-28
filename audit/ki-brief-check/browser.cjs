// Browser-Prüfung und Screenshots des KI-Brief-Checks (lokal, nur 127.0.0.1).
// Befehl: (cd audit/tools && npm ci) && node audit/ki-brief-check/browser.cjs
const { chromium } = require('../tools/node_modules/playwright');
const { AxeBuilder } = require('../tools/node_modules/@axe-core/playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const letter = fs.readFileSync(path.join(ROOT, 'tests/ki-brief-check/fixtures/brief-01.txt'), 'utf8');

const server = http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
  if (file.endsWith(path.sep)) file += 'index.html';
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});

(async () => {
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = origin + '/hausverwaltung/ki-brief-check/';
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch(fs.existsSync(chrome) ? { executablePath: chrome } : {});
  const report = [];
  try {
    for (const [width, height] of [[320, 700], [375, 812], [1440, 900]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], requests = [], failed = [];
      let dialogs = 0;
      page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', (d) => { dialogs += 1; d.dismiss(); });
      context.on('request', (r) => requests.push(r.url()));
      page.on('response', (r) => { if (!r.ok()) failed.push(r.url()); });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const loaded = requests.length;

      assert.equal(await page.locator('#result').isVisible(), false, 'Ergebnis und Newsletter erst nach der Analyse');
      await page.click('#checkButton');
      assert.match(await page.textContent('#letterError'), /fügen Sie zuerst/);
      await page.fill('#letter', 'a'.repeat(8001));
      await page.click('#checkButton');
      assert.match(await page.textContent('#letterError'), /zu lang/);

      const attack = 'Mein Anspruch <img src="x" onerror="alert(1)"><script>alert(2)</script> gilt.';
      await page.fill('#letter', attack);
      await page.click('#checkButton');
      await page.waitForSelector('#claims li');
      assert.equal(await page.locator('#claims img, #claims script').count(), 0);
      assert.ok((await page.textContent('#claims')).includes('<img src="x" onerror="alert(1)">'));

      // Vier unbekannte Aussagen: alle unklar, der Entwurf bleibt neutral.
      await page.fill('#letter', [
        'Die Anfechtungsklage muss innerhalb eines Monats begründet werden.',
        'Der Verwalter hat das Recht, uns die Einsicht in die Verwaltungsunterlagen zu verweigern.',
        'Mein Nachbar hat Anspruch auf Entfernung meiner Wallbox.',
        'Nach der Modernisierung erhöht sich Ihre Miete jährlich um 8 Prozent.'
      ].join(' '));
      await page.click('#checkButton');
      await page.waitForSelector('#claims li');
      assert.equal(await page.textContent('#status'), '4 Hinweise: 0 belegt, 0 fraglich, 4 unklar.');
      assert.doesNotMatch(await page.inputValue('#draft'), /Ihrer Darstellung können wir so nicht folgen/);
      assert.match(await page.inputValue('#draft'), /Wir prüfen Ihren Hinweis zu „/);
      assert.ok((await page.textContent('#claims')).includes('Zum Nachlesen: § 45 WEG'));
      assert.ok((await page.textContent('body')).includes('Der Prototyp bewertet nur bekannte Musterformulierungen'));

      // Katalog-Satz mit widersprechendem Folgesatz: keine Bestätigung.
      await page.fill('#letter', 'Als Wohnungseigentümer habe ich das Recht, Einsicht in die Verwaltungsunterlagen zu nehmen.\n\nDas gilt allerdings nicht.');
      await page.click('#checkButton');
      await page.waitForSelector('#claims li');
      assert.match(await page.textContent('#status'), /0 belegt, 0 fraglich/);

      await page.fill('#letter', letter);
      assert.equal(await page.locator('#result').isVisible(), false, 'altes Ergebnis wird bei Änderung verborgen');
      await page.focus('#checkButton');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#claims li');
      assert.equal(await page.locator('#claims li').count(), 5);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'claimsTitle');
      const status = await page.textContent('#status');
      assert.equal(status, '5 Hinweise: 1 belegt, 3 fraglich, 1 unklar.');
      assert.match(await page.inputValue('#draft'), /\[Name\][\s\S]*\[Verwaltung\]/);
      assert.equal(await page.textContent('#resultDisclaimer'), 'Hinweise mit Quelle, kein Rechtsrat. Das Ergebnis ersetzt keine anwaltliche Prüfung.');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, 'kein horizontales Scrollen bei ' + width);
      if (width !== 320) await page.screenshot({ path: path.join(__dirname, `ki-brief-check-${width}.png`), fullPage: true });

      assert.equal(await page.isChecked('#optin'), false);
      await page.click('#newsButton');
      assert.match(await page.textContent('#newsStatus'), /Häkchen/);
      await page.check('#optin');
      await page.fill('#email', 'keine-adresse');
      await page.click('#newsButton');
      assert.match(await page.textContent('#newsStatus'), /gültige E-Mail/);
      await page.fill('#email', 'test@example.org');
      await page.press('#email', 'Enter');
      assert.equal(await page.textContent('#newsStatus'), 'Double-Opt-in folgt – Prototyp, es wird nichts gespeichert oder gesendet.');
      await page.waitForTimeout(300);

      // Nach dem Laden: keine Anfrage mehr (Ausnahme: Schrift-/Bilddateien der eigenen Seite), keine Speicherung.
      const later = requests.slice(loaded).filter((u) => !(u.startsWith(origin) && /\.(woff2|svg|png|ico)$/.test(u)));
      assert.deepEqual(later, []);
      assert.deepEqual(requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:')), []);
      assert.equal(page.url(), url, 'kein Text in der Adresszeile');
      const stored = await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie, databases: (await indexedDB.databases()).length }));
      assert.deepEqual(stored, { local: 0, session: 0, cookie: '', databases: 0 });
      assert.deepEqual(await context.cookies(), []);
      assert.deepEqual(errors, []);
      // axe zuletzt: es lädt selbst Stylesheets nach und würde die Netzwerkprüfung verfälschen.
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`), []);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.inputValue('#letter'), '', 'Text überlebt das Neuladen nicht');
      assert.equal(dialogs, 0);
      assert.deepEqual(failed, []);
      report.push({ width, status, overflow, axeViolations: 0, requestsOnLoad: loaded, requestsAfterLoadOtherThanStatic: 0, externalRequests: 0, stored, errors: 0 });
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(url);
    assert.equal(await page.isDisabled('#checkButton'), true);
    // Playwright schaltet nur die Ausführung ab; <noscript> rendert dabei nicht, daher Prüfung am Quelltext.
    assert.match(await page.content(), /<noscript>[\s\S]*braucht diese Seite JavaScript/);
    await page.fill('#letter', 'geheim');
    await page.press('#letter', 'Enter');
    assert.equal(page.url(), url);
    report.push({ javascript: false, buttonDisabled: true, noscriptInSource: true });
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(__dirname, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  console.log('browser ok');
})().catch((error) => { console.error(error); process.exitCode = 1; server.close(); });
