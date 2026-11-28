'use strict';
// Befehl (im Repo-Wurzelverzeichnis): node --test tests/ki-brief-check/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const PAGE = 'hausverwaltung/ki-brief-check';
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const api = require(path.join(ROOT, PAGE, 'analyzer.js'));
const knowledge = require(path.join(ROOT, PAGE, 'knowledge.js'));
const page = require(path.join(ROOT, PAGE, 'page.js'));
const expected = require('./fixtures/expected.json');
const counter = require('./counter-statements.json');

const { analyzeLetter, mockProvider, remoteProvider, splitSentences, MAX_LENGTH, DISCLAIMER, NO_SOURCE } = api;
const key = (c) => `${c.rating} | ${c.source} | ${c.text}`;

/* ── Fixtures ── */
test('es gibt genau 10 Fiktivbriefe mit Erwartungen', () => {
  const letters = fs.readdirSync(path.join(__dirname, 'fixtures')).filter((f) => f.endsWith('.txt')).sort();
  assert.equal(letters.length, 10);
  assert.deepEqual(Object.keys(expected).sort(), letters);
  for (const list of Object.values(expected)) assert.ok(list.length >= 1);
});

for (const [file, wanted] of Object.entries(expected)) {
  test(`${file}: erwartete Einschätzungen und Quellen, keine zusätzlichen`, async () => {
    const { claims, disclaimer } = await analyzeLetter(read(`tests/ki-brief-check/fixtures/${file}`));
    const open = [...claims];
    for (const want of wanted) {
      const i = open.findIndex((c) => c.text.includes(want.contains) && c.rating === want.rating && c.source === want.source);
      assert.notEqual(i, -1, `fehlt: ${key({ ...want, text: want.contains })}\nvorhanden:\n${claims.map(key).join('\n')}`);
      open.splice(i, 1);
    }
    assert.deepEqual(open.map(key), [], 'unerwartete Treffer');
    assert.equal(disclaimer, DISCLAIMER);
    for (const c of claims) assert.ok(c.reason.length > 20 && c.source);
  });
}

test('die Fixtures decken alle drei Einschätzungen ab', () => {
  const all = Object.values(expected).flat();
  for (const rating of api.RATINGS) assert.ok(all.filter((c) => c.rating === rating).length >= 5, rating);
});

/* ── Gegenproben ── */
for (const { text, mustNot } of counter.cases) {
  test(`Gegenprobe: ${text}`, async () => {
    const { claims } = await analyzeLetter(text);
    assert.deepEqual(claims.filter((c) => mustNot.includes(c.rating)).map(key), []);
  });
}

test('ein nicht geprüftes Urteil macht auch eine passende Regel höchstens unklar', async () => {
  const { claims } = await analyzeLetter('Die Anfechtungsklage muss laut BGH, Az. V ZR 1/20, innerhalb eines Monats erhoben werden.');
  assert.ok(claims.length >= 2);
  assert.ok(claims.every((c) => c.rating === 'unklar'));
});

test('Sätze mit Rechtsbezug ohne Regel erscheinen als unklar ohne Quelle', async () => {
  const { claims } = await analyzeLetter('Die Hausordnung ist rechtswidrig.');
  assert.deepEqual(claims.map((c) => [c.rating, c.source]), [['unklar', NO_SOURCE]]);
});

/* ── Wissensbasis ── */
test('Wissensbasis zitiert nur Paragrafen, deren Wortlaut abgeglichen wurde', () => {
  const verified = {
    WEG: ['16', '18', '19', '20', '21', '23', '24', '25', '26', '28', '44', '45'],
    BGB: ['535', '536', '536c', '555c', '555d', '556', '559', '559b', '561']
  };
  const ids = new Set();
  for (const rule of knowledge.RULES) {
    assert.ok(!ids.has(rule.id), 'doppelte id ' + rule.id);
    ids.add(rule.id);
    assert.ok(api.RATINGS.includes(rule.rating), rule.id);
    assert.ok(rule.reason && rule.reply && rule.label && rule.topic && rule.when.length, rule.id);
    for (const part of rule.source.split('; ')) {
      const law = part.match(/(WEG|BGB)$/);
      assert.ok(law, `${rule.id}: ${part}`);
      const numbers = part.startsWith('§§') ? part.match(/\d+[a-e]?/g) : [part.match(/^§ (\d+[a-e]?)/)[1]];
      for (const n of numbers) assert.ok(verified[law[1]].includes(n), `${rule.id}: § ${n} ${law[1]} nicht abgeglichen`);
    }
    for (const text of [rule.reason, rule.reply]) {
      for (const [, n] of text.matchAll(/§§? ?(\d+[a-e]?)/g)) {
        assert.ok([...verified.WEG, ...verified.BGB, '22', '555b', '558', '559c', '559e'].includes(n), `${rule.id}: § ${n} im Text`);
      }
    }
  }
});

/* ── Eingaben ── */
test('leere Eingabe wird abgelehnt', async () => {
  for (const input of ['', '   \n\t ', undefined, null, 42]) {
    await assert.rejects(analyzeLetter(input), { code: 'EMPTY' });
  }
});

test('zu lange Eingabe wird abgelehnt, die Grenze selbst ist erlaubt', async () => {
  await assert.rejects(analyzeLetter('a'.repeat(MAX_LENGTH + 1)), { code: 'TOO_LONG' });
  await analyzeLetter('a'.repeat(MAX_LENGTH));
});

test('lange und bösartige Eingaben bleiben schnell', async () => {
  const inputs = [
    'Miete '.repeat(1300), 'Beschluss anfechten innerhalb '.repeat(260), 'nicht ohne Zustimmung '.repeat(360),
    'x'.repeat(MAX_LENGTH), ' .'.repeat(4000), 'BGH '.repeat(2000), 'Hausgeld zurück Kosten § 16 '.repeat(280)
  ];
  const start = process.hrtime.bigint();
  for (const input of inputs) await analyzeLetter(input.slice(0, MAX_LENGTH));
  assert.ok(Number(process.hrtime.bigint() - start) / 1e6 < 3000);
});

test('Satztrennung hält Abkürzungen, Paragrafen und Datumsangaben zusammen', () => {
  assert.deepEqual(
    splitSentences('Nach § 556 Abs. 3 BGB gilt z. B. eine Frist. Am 3. Mai kam der Brief, ca. 10 Uhr.\n\nGruß'),
    ['Nach § 556 Abs. 3 BGB gilt z. B. eine Frist.', 'Am 3. Mai kam der Brief, ca. 10 Uhr.', 'Gruß']
  );
  assert.deepEqual(splitSentences('Das war 2025. Jetzt reicht es!\n- Punkt eins\n- Punkt zwei'),
    ['Das war 2025.', 'Jetzt reicht es!', '- Punkt eins', '- Punkt zwei']);
});

test('gleiche Eingabe ergibt gleiches Ergebnis', async () => {
  const letter = read('tests/ki-brief-check/fixtures/brief-01.txt');
  assert.deepEqual(await analyzeLetter(letter), await analyzeLetter(letter));
});

/* ── Entwurf und Hinweis ── */
test('der Entwurf nutzt Platzhalter und übernimmt keinen Text aus dem Brief', async () => {
  const { draft } = await analyzeLetter('Ich, Geheimname Xyz, halte das Hausgeld zurück. Kontonummer 999888777 ist mein Recht.');
  assert.match(draft, /\[Name\]/);
  assert.match(draft, /\[Objekt\]/);
  assert.doesNotMatch(draft, /Geheimname|999888777/);
});

test('der Entwurf nennt ein Thema nur einmal und bestätigt bei Widerspruch nichts', async () => {
  const { draft } = await analyzeLetter('Die Anfechtungsklage ist innerhalb eines Monats zu erheben. Zur Anfechtung des Beschlusses habe ich eine Frist von sechs Wochen.');
  assert.equal(draft.match(/Frist der Anfechtungsklage/g).length, 1);
  assert.match(draft, /prüfen wir anhand der Unterlagen/);
});

test('der Hinweis ist immer vorhanden', async () => {
  assert.equal(DISCLAIMER, 'Hinweise mit Quelle, kein Rechtsrat. Das Ergebnis ersetzt keine anwaltliche Prüfung.');
  for (const input of ['Hallo.', 'Ich halte das Hausgeld zurück.']) {
    assert.equal((await analyzeLetter(input)).disclaimer, DISCLAIMER);
  }
  const provider = { analyze: () => ({ claims: [], draft: '', disclaimer: 'anderer Text' }) };
  assert.equal((await analyzeLetter('x', { provider })).disclaimer, DISCLAIMER);
  assert.ok(read(`${PAGE}/index.html`).includes('<strong>Hinweise mit Quelle, kein Rechtsrat.</strong> Das Ergebnis ersetzt keine anwaltliche Prüfung.'));
});

/* ── Provider ── */
test('mockProvider ist Standard', async () => {
  const letter = 'Ich halte das Hausgeld zurück.';
  assert.deepEqual((await analyzeLetter(letter)).claims, mockProvider.analyze(letter).claims);
});

test('remoteProvider wirft ohne Konfiguration', async () => {
  assert.throws(() => remoteProvider.analyze('x'), { code: 'NOT_CONFIGURED', message: /nicht konfiguriert/ });
  await assert.rejects(analyzeLetter('x', { provider: remoteProvider }), { code: 'NOT_CONFIGURED' });
});

test('ungültige Provider-Antworten werden abgefangen', async () => {
  await assert.rejects(analyzeLetter('x', { provider: { analyze: () => ({}) } }), { code: 'BAD_RESPONSE' });
  const provider = { analyze: async () => ({ draft: '', claims: [
    { text: 'a', rating: 'sicher', reason: 'r', source: '§ 1' }, { text: 'b', rating: 'belegt', reason: 'r', source: '' }
  ] }) };
  const { claims } = await analyzeLetter('x', { provider });
  assert.deepEqual(claims.map((c) => c.rating), ['unklar', 'unklar']);
  assert.equal(claims[1].source, NO_SOURCE);
});

/* ── XSS ── */
function fakeDocument() {
  const node = (tag) => ({
    tag, children: [], attributes: {}, textContent: '', className: '',
    set innerHTML(_) { throw new Error('innerHTML verwendet'); },
    set outerHTML(_) { throw new Error('outerHTML verwendet'); },
    insertAdjacentHTML() { throw new Error('insertAdjacentHTML verwendet'); },
    setAttribute(name, value) { this.attributes[name] = value; },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; }
  });
  return { createElement: node };
}

test('ein XSS-String wird als Text ausgegeben, nicht als HTML', async () => {
  const attack = '<img src=x onerror=alert(1)> Mein Anspruch <script>alert(2)</script> ist klar.';
  const { claims, draft } = await analyzeLetter(attack);
  assert.ok(claims.length >= 1);
  const doc = fakeDocument();
  const list = doc.createElement('ol');
  page.renderClaims(doc, list, claims);
  const tags = [];
  const texts = [];
  (function walk(n) { tags.push(n.tag); texts.push(n.textContent); n.children.forEach(walk); }(list));
  assert.deepEqual([...new Set(tags)].sort(), ['blockquote', 'li', 'ol', 'p', 'span']);
  assert.ok(texts.some((t) => t.includes('<img src=x onerror=alert(1)>')));
  assert.doesNotMatch(draft, /<img|<script/);
});

/* ── Statische Prüfung der Seite ── */
const html = read(`${PAGE}/index.html`);
const files = fs.readdirSync(path.join(ROOT, PAGE));

test('der Ordner enthält nur die erwarteten Dateien', () => {
  assert.deepEqual(files.sort(), ['analyzer.js', 'index.html', 'knowledge.js', 'page.css', 'page.js']);
});

test('noindex, nofollow ist gesetzt', () => {
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
});

test('die Newsletter-Checkbox ist nicht vorangekreuzt', () => {
  const boxes = html.match(/<input[^>]*type="checkbox"[^>]*>/g);
  assert.equal(boxes.length, 1);
  assert.doesNotMatch(boxes[0], /\bchecked\b/);
  assert.doesNotMatch(read(`${PAGE}/page.js`), /\.checked\s*=\s*true|setAttribute\(\s*['"]checked/);
  assert.ok(html.includes('Double-Opt-in folgt – Prototyp, es wird nichts gespeichert oder gesendet'));
});

test('der Schwärzungshinweis steht über dem Eingabefeld', () => {
  assert.ok(html.indexOf('id="redactHint"') > 0 && html.indexOf('id="redactHint"') < html.indexOf('<textarea id="letter"'));
  assert.match(html, /keine Namen, Adressen, Kontodaten/);
});

for (const file of files) {
  test(`${file}: kein Netzwerk, keine Speicherung, kein HTML aus Zeichenketten`, () => {
    const source = read(`${PAGE}/${file}`);
    const banned = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\bimport\s*\(|localStorage|sessionStorage|indexedDB|\.cookie\b|document\.cookie|serviceWorker|\bcaches\.|innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function|gtag\(|googletagmanager|plausible|matomo/i;
    assert.doesNotMatch(source, banned);
    assert.doesNotMatch(source, /api[_-]?key\s*[:=]|Bearer [A-Za-z0-9]|sk-[A-Za-z0-9]{8}/i);
  });
}

test('die Seite lädt nur eigene Ressourcen und verbietet Verbindungen per CSP', () => {
  for (const [, url] of html.matchAll(/<(?:script|img|link|iframe|source)\b[^>]*?\b(?:src|href)="([^"]+)"/g)) {
    assert.doesNotMatch(url, /^(?:[a-z]+:)?\/\//i, url);
    assert.ok(fs.existsSync(path.join(ROOT, PAGE, url)), 'fehlt: ' + url);
  }
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/);
  assert.doesNotMatch(html, /<(?:input|textarea|select)\b[^>]*\bname=/, 'ohne name landet nie Text in einer URL');
});

test('Ergebnisbereich und Felder sind barrierearm ausgezeichnet', () => {
  assert.match(html, /<html lang="de">/);
  assert.match(html, /role="status" aria-live="polite"/);
  for (const [, id] of html.matchAll(/<(?:textarea|input)\b[^>]*\bid="([^"]+)"/g)) assert.ok(html.includes(`for="${id}"`), id);
  assert.equal(html.match(/<h1[\s>]/g).length, 1);
});

test('die Route steht weder in sitemap.xml noch in den llms-Dateien', () => {
  for (const file of ['sitemap.xml', 'llms.txt', 'llms-full.txt']) assert.doesNotMatch(read(file), /ki-brief-check/i, file);
  assert.doesNotMatch(read('robots.txt'), /ki-brief-check/i);
});

test('der Prototyp wird nicht veröffentlicht', () => {
  assert.doesNotMatch(read('scripts/pages-allowlist.txt'), /ki-brief-check/);
  assert.match(read('scripts/pages-internal.txt'), /^hausverwaltung\/ki-brief-check\/\*\*$/m);
  assert.match(read('_config.yml'), /^\s+- hausverwaltung\/ki-brief-check\/$/m);
  assert.match(read('_config.yml'), /^\s+- tests\/$/m);
});
