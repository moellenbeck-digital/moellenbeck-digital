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
const findingsR1 = require('./befunde-r1.json');
const ownR1 = require('./gegenproben-r1-eigen.json');
const supported = require('./belegt-beispiele.json');

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
      if (part === NO_SOURCE) { assert.equal(rule.rating, 'unklar', rule.id); continue; }
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
    { text: 'a', rating: 'sicher', reason: 'r', source: '§ 45 WEG' }, { text: 'b', rating: 'belegt', reason: 'r', source: '' }
  ] }) };
  const { claims } = await analyzeLetter('x', { provider });
  assert.deepEqual(claims.map((c) => c.rating), ['unklar', 'unklar']);
  assert.equal(claims[1].source, NO_SOURCE);
});

test('belegt und fraglich gelten nur mit einer Quelle aus der Wissensbasis', async () => {
  const claim = (source, rating = 'belegt') => ({ text: 't', rating, reason: 'r', source });
  const provider = { analyze: () => ({ draft: '', claims: [
    claim(NO_SOURCE), claim('§ 999 BGB'), claim('§ 45 WEG; § 999 WEG'), claim('irgendwas', 'fraglich'), claim(undefined), claim(['§ 45 WEG']),
    claim('§ 45 WEG'), claim('§ 44 Abs. 1 WEG; § 45 WEG', 'fraglich')
  ] }) };
  const { claims } = await analyzeLetter('x', { provider });
  assert.deepEqual(claims.map((c) => c.rating), ['unklar', 'unklar', 'unklar', 'unklar', 'unklar', 'unklar', 'belegt', 'fraglich']);
  assert.ok(claims.slice(0, 6).every((c) => c.source === NO_SOURCE));
});

test('die Oberfläche nutzt den übergebenen Provider', async () => {
  const nodes = new Map();
  const doc = fakeDocument();
  doc.getElementById = (id) => {
    if (!nodes.has(id)) {
      const listeners = {};
      nodes.set(id, Object.assign(doc.createElement('div'), {
        value: 'Brieftext', listeners, addEventListener: (type, fn) => { listeners[type] = fn; },
        removeAttribute() {}, focus() {}
      }));
    }
    return nodes.get(id);
  };
  const seen = [];
  page.init(doc, api, { analyze: (text) => { seen.push(text); return { claims: [], draft: 'vom Provider' }; } });
  await nodes.get('letterForm').listeners.submit({ preventDefault() {} });
  assert.deepEqual(seen, ['Brieftext']);
  assert.equal(nodes.get('draft').value, 'vom Provider');
});

/* ── Korrektur R1: "belegt" ist konservativ ── */
for (const [name, set] of [['Befund R1', findingsR1], ['Eigene Gegenprobe', ownR1]]) {
  for (const text of set.sentences) {
    test(`${name}, nie belegt: ${text}`, async () => {
      const { claims, draft } = await analyzeLetter(text);
      assert.ok(claims.length >= 1, 'kein Hinweis');
      assert.deepEqual(claims.filter((c) => !['fraglich', 'unklar'].includes(c.rating)).map(key), []);
      for (const rule of knowledge.RULES.filter((r) => r.rating === 'belegt')) assert.ok(!draft.includes(rule.reply), 'Entwurf bestätigt: ' + rule.id);
    });
  }
}

test('es gibt genau 15 eigene Gegenproben', () => {
  assert.equal(new Set(ownR1.sentences).size, 15);
});

const supportedRules = knowledge.RULES.filter((r) => r.rating === 'belegt');

test('jede belegt-Regel hat enge Formen, Rollen- und Zahlenprüfung und ein Beispiel', () => {
  for (const rule of supportedRules) {
    assert.ok(rule.forms.length && rule.foreign.length && Array.isArray(rule.numbers), rule.id);
    for (const re of rule.forms) assert.ok(re.source.startsWith('^') && re.source.endsWith('$'), rule.id);
    if (rule.slots) assert.ok(rule.wrong.reason && rule.wrong.reply, rule.id);
  }
  assert.deepEqual(Object.keys(supported).filter((k) => k !== '_comment').sort(), supportedRules.map((r) => r.id).sort());
});

// Jede Abwandlung eines bestätigten Satzes muss die Bestätigung verlieren.
const VARIANTS = [
  (s) => s.replace(/\.$/, ', aber nicht in diesem Fall.'),
  (s) => s.replace(/\.$/, ', wenn der Beirat zustimmt.'),
  (s) => s.replace(/\.$/, ' und ich zahle nichts.'),
  (s) => s.replace(/\.$/, '?'),
  (s) => 'Nur ' + s,
  (s) => 'Es ist falsch: ' + s,
  (s) => s.replace(/ (\S+)\.$/, ' nicht $1.'),
  (s) => s.replace(/ (\S+)\.$/, ' höchstens $1.'),
  (s) => s.replace(/ (\S+)\.$/, ' erst nach 5 Jahren $1.')
];

for (const rule of supportedRules) {
  test(`${rule.id}: Beispiel ist belegt, jede Abwandlung nicht`, async () => {
    for (const text of supported[rule.id]) {
      const { claims } = await analyzeLetter(text);
      assert.deepEqual(claims.map((c) => [c.rating, c.source]), [['belegt', rule.source]], text);
      for (const variant of VARIANTS) {
        const changed = variant(text);
        assert.notEqual(changed, text);
        assert.deepEqual((await analyzeLetter(changed)).claims.filter((c) => c.rating === 'belegt').map(key), [], changed);
      }
    }
  });
}

test('eine abweichende Zahl ergibt fraglich mit Hinweis auf die richtige Frist', async () => {
  for (const [text, hint] of [
    ['Die Anfechtungsklage muss innerhalb eines Monats begründet werden.', /zwei Monate/],
    ['Die Anfechtungsklage ist innerhalb eines Monats zu begründen.', /zwei Monate/],
    ['Die Anfechtungsklage muss innerhalb von drei Monaten erhoben werden.', /einen Monat/],
    ['Die Anfechtungsklage ist innerhalb von zwei Monaten zu erheben und innerhalb eines Monats zu begründen.', /innerhalb zweier Monate/],
    ['Die Einladungsfrist beträgt zwei Wochen.', /drei Wochen/],
    ['Die Betriebskostenabrechnung muss innerhalb von 24 Monaten nach Ende des Abrechnungszeitraums zugehen.', /zwölf Monate/],
    ['Einwendungen sind innerhalb von sechs Monaten nach Zugang der Abrechnung mitzuteilen.', /zwölf/],
    ['Eine Modernisierung muss einen Monat vor Beginn angekündigt werden.', /./],
    ['Die Modernisierung ist innerhalb eines Monats anzukündigen.', null],
    ['Eine Modernisierung muss 1 Monat vor Beginn angekündigt werden.', /drei Monate/]
  ]) {
    const { claims, draft } = await analyzeLetter(text);
    assert.ok(claims.every((c) => c.rating !== 'belegt'), text);
    if (hint === null) continue;
    assert.deepEqual(claims.map((c) => c.rating), ['fraglich'], text);
    assert.match(claims[0].reason, hint, text);
    assert.match(draft, /Ihrer Darstellung können wir so nicht folgen/);
  }
});

test('bei fraglich widerspricht der Entwurf sachlich', async () => {
  const letter = 'Ich halte das Hausgeld zurück. Die Einladung zur Versammlung ist mit einer Frist von zwei Wochen ausreichend.';
  const { claims, draft } = await analyzeLetter(letter);
  assert.deepEqual(claims.map((c) => c.rating), ['fraglich', 'fraglich']);
  assert.equal(draft.match(/Ihrer Darstellung können wir so nicht folgen; wir prüfen den Punkt/g).length, 2);
});

test('Heizkosten werden nicht nach § 16 WEG bewertet', async () => {
  for (const text of [
    'Nach der HeizkostenV müssen die Heizkosten zwingend nach Verbrauch und nur zum Rest nach Wohnfläche verteilt werden.',
    'Die Heizkosten müssen immer nach Wohnfläche verteilt werden.',
    'Die Warmwasserkosten sind gesetzlich zwingend nach Verbrauch und Wohnfläche umzulegen.',
    'Die Heizkosten werden nach Miteigentumsanteilen verteilt.'
  ]) {
    const { claims, draft } = await analyzeLetter(text);
    assert.ok(claims.length && claims.every((c) => c.rating === 'unklar'), text + ' ' + claims.map(key).join());
    assert.doesNotMatch(draft, /Miteigentumsanteil/, text);
  }
});

test('Baukosten bei qualifizierter Mehrheit sind unklar (§ 21 Abs. 2 WEG)', async () => {
  const { claims } = await analyzeLetter('Die Kosten für den Treppenlift muss die Gemeinschaft tragen, weil er mit Zweidrittelmehrheit beschlossen wurde.');
  assert.deepEqual(claims.map((c) => [c.rating, c.source]), [['unklar', '§ 21 Abs. 2 WEG']]);
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
