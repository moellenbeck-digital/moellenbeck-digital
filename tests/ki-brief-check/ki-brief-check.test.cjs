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
const findingsR2 = require('./befunde-r2.json');

const { analyzeLetter, mockProvider, remoteProvider, splitSentences, normalize, MAX_LENGTH, DISCLAIMER, NO_SOURCE } = api;
const { CATALOG, TOPICS } = knowledge;
const inCatalog = new Set(CATALOG.map((e) => normalize(e.sentence)));
const decided = (claims) => claims.filter((c) => c.rating !== 'unklar').map((c) => `${c.rating} | ${c.source} | ${c.text}`);
const DISAGREE = /Ihrer Darstellung können wir so nicht folgen/;
const entry = (id) => CATALOG.find((e) => e.id === id);
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

test('ein zitiertes Urteil wird nie bewertet', async () => {
  const { claims } = await analyzeLetter('Die Anfechtungsklage muss laut BGH, Az. V ZR 1/20, innerhalb eines Monats erhoben werden.');
  assert.deepEqual(claims.map((c) => [c.rating, c.source]), [['unklar', NO_SOURCE]]);
});

test('Sätze mit Rechtsbezug ohne Thema erscheinen als unklar ohne Quelle', async () => {
  const { claims } = await analyzeLetter('Die Hausordnung ist rechtswidrig.');
  assert.deepEqual(claims.map((c) => [c.rating, c.source]), [['unklar', NO_SOURCE]]);
});

/* ── Wissensbasis ── */
const VERIFIED = {
  WEG: ['16', '18', '20', '21', '23', '24', '25', '26', '28', '44', '45', '46'],
  BGB: ['535', '536', '536b', '536c', '555b', '555c', '555d', '556', '559', '561']
};

test('der Katalog ist klein, eindeutig und vollständig ausgefüllt', () => {
  assert.equal(CATALOG.length, 27);
  assert.equal(inCatalog.size, CATALOG.length, 'doppelter Satz');
  assert.equal(new Set(CATALOG.map((e) => e.id)).size, CATALOG.length, 'doppelte id');
  for (const e of CATALOG) {
    assert.ok(['belegt', 'fraglich'].includes(e.rating), e.id);
    assert.ok(['weg', 'miete'].includes(e.area), e.id);
    assert.ok(e.label && e.topic && e.reason.length > 40 && e.reply, e.id);
    assert.deepEqual(splitSentences(e.sentence), [e.sentence], e.id);
  }
});

test('Katalog und Themen zitieren nur abgeglichene Paragrafen', () => {
  for (const item of [...CATALOG, ...TOPICS]) {
    if (item.source === knowledge.HEATING_SOURCE) continue; // HeizkostenV §§ 3, 7 abgeglichen
    for (const part of item.source.split('; ')) {
      const law = part.match(/(WEG|BGB)$/);
      assert.ok(law, `${item.id}: ${part}`);
      const numbers = part.startsWith('§§') ? part.match(/\d+[a-e]?/g) : [part.match(/^§ (\d+[a-e]?)/)[1]];
      for (const n of numbers) assert.ok(VERIFIED[law[1]].includes(n), `${item.id}: § ${n} ${law[1]} nicht abgeglichen`);
    }
  }
});

test('belegt-Begründungen nennen die Grenzen (N-a, N-b)', () => {
  const rent = entry('modernisierung-8-prozent');
  for (const text of [rent.reason, rent.reply]) assert.match(text, /§ 555b Nummer 1, 3, 4, 5 oder 6/);
  assert.match(entry('minderung-grundsatz').reason, /unerhebliche Minderung der Tauglichkeit bleibt außer Betracht/);
  assert.match(entry('minderung-grundsatz').reply, /nicht nur unerheblich/);
  for (const text of [entry('modernisierung-ankuendigung').reason, entry('modernisierung-ankuendigung').reply]) {
    assert.match(text, /unerheblichen Einwirkung auf die Mietsache verbunden .*und nur zu einer unerheblichen Mieterhöhung/);
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
  assert.deepEqual(splitSentences('Das war 2025. Jetzt reicht es!\n- Punkt eins.\n- Punkt zwei'),
    ['Das war 2025.', 'Jetzt reicht es!', '- Punkt eins.', '- Punkt zwei']);
});

test('Zeilen und Absätze ohne Satzzeichen gehören zusammen, nur die Anrede steht allein', () => {
  assert.deepEqual(splitSentences('Er muss zahlen\n\nallerdings erst später.'), ['Er muss zahlen allerdings erst später.']);
  assert.deepEqual(splitSentences('Sie schreiben:\n- Es gilt.'), ['Sie schreiben: - Es gilt.']);
  assert.deepEqual(splitSentences('Er muss zahlen\n\nDas Gegenteil.'), ['Er muss zahlen Das Gegenteil.']);
  assert.deepEqual(splitSentences('Sehr geehrte Damen und Herren,\n\nich frage.'), ['Sehr geehrte Damen und Herren,', 'ich frage.']);
  assert.deepEqual(splitSentences('Guten Tag,\nich frage.'), ['Guten Tag,', 'ich frage.']);
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

test('der Entwurf nennt ein Thema nur einmal und bleibt bei gemischten Urteilen neutral', async () => {
  const { draft } = await analyzeLetter(`${entry('anfechtung-ein-monat').sentence} Zur Anfechtung des Beschlusses habe ich eine Frist von sechs Wochen.`);
  assert.equal(draft.match(/^\d+\. /gm).length, 1, draft);
  assert.match(draft, /Wir prüfen Ihren Hinweis zu „Frist der Anfechtungsklage“ und melden uns\./);
  assert.ok(!draft.includes(entry('anfechtung-ein-monat').reply));
});

test('zwei fraglich-Sätze zum selben Thema: ein Absatz, ein Widerspruch, beide Bausteine', async () => {
  const [a, b] = [entry('anfechtung-zwei-monate'), entry('anfechtung-protokoll')];
  const { draft } = await analyzeLetter(`${a.sentence} ${b.sentence}`);
  assert.equal(draft.match(new RegExp(DISAGREE, 'g')).length, 1);
  assert.ok(draft.includes(a.reply) && draft.includes(b.reply));
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

/* ── Katalog und Eigenschaften ── */
for (const e of CATALOG) {
  test(`Katalog ${e.id}: allein ${e.rating}, auch bei anderer Schreibweise`, async () => {
    for (const text of [e.sentence, `  „${e.sentence}“  `, e.sentence.toLowerCase(), e.sentence.replace(/,/g, '').replace(/ /g, '\n')]) {
      const { claims, draft } = await analyzeLetter(text);
      assert.deepEqual(claims.map((c) => [c.rating, c.source]), [[e.rating, e.source]], text);
      assert.equal(DISAGREE.test(draft), e.rating === 'fraglich', text);
      assert.ok(draft.includes(e.reply));
    }
  });
}

const NUMBER_SWAPS = [
  ['eines Monats', 'zweier Monate'], ['zwei Monate', 'drei Monate'], ['zwei Wochen', 'drei Wochen'], ['drei Monate', 'zwei Monate'],
  ['sechs Monaten', 'zwölf Monaten'], ['sechs Monate', 'drei Monate'], ['zwölf Monaten', 'sechs Monaten'], ['8 Prozent', '11 Prozent'],
  ['11 Prozent', '8 Prozent'], ['31. März', '30. Juni'], ['§ 46', '§ 45']
];
const variants = (e) => {
  const s = e.sentence;
  const foreign = e.area === 'weg'
    ? ['Es geht um meinen Mietvertrag.', 'Ich bin Mieter.', 'Es geht um unser Gewerbe.']
    : ['Es geht um unsere WEG.', 'Ich bin Eigentümerin.', 'Es geht um unseren Gewerbemietvertrag.'];
  return [
    s.replace(/ (\S+)\.$/, ' nicht $1.'),
    s.replace(/^(\S+ \S+) /, '$1 keinesfalls '),
    `Es stimmt nicht, dass ${s}`,
    s.replace(/\.$/, ', aber nur mit Zustimmung.'),
    s.replace(/\.$/, '?'),
    s.replace(/\.$/, '\n\nallerdings ausschließlich in Ausnahmefällen.'),
    `Sie behaupten Folgendes:\n- ${s}`,
    `${s} Das gilt allerdings nicht.`,
    `${s}\n\nDas ist falsch.`,
    `${s} Das sehen wir anders.`,
    `${s} Diese Regel wurde abgeschafft.`,
    `${s} Wir haben nichts zu ergänzen. Dies gilt jedoch erst, wenn der Beirat zustimmt.`,
    `Das Folgende ist falsch. ${s}`,
    `${s} Ein solches Recht gibt es nicht.`,
    `${s} In unserem Fall greift das nicht.`,
    `${s} Voraussetzung ist die Zustimmung des Beirats.`,
    ...foreign.flatMap((f) => [`${f} ${s}`, `${s} ${f}`]),
    ...NUMBER_SWAPS.filter(([from]) => s.includes(from)).map(([from, to]) => s.replace(from, to))
  ];
};

test('Eigenschaft: jede Variante eines Katalog-Satzes ist unklar, ohne Widerspruch und ohne Bestätigung', async () => {
  let checked = 0;
  for (const e of CATALOG) {
    for (const text of variants(e)) {
      assert.notEqual(text, e.sentence);
      const { claims, draft } = await analyzeLetter(text);
      assert.deepEqual(decided(claims), [], text);
      assert.doesNotMatch(draft, DISAGREE, text);
      assert.ok(!draft.includes(e.reply), text);
      checked += 1;
    }
  }
  assert.ok(checked >= CATALOG.length * 22, String(checked));
});

test('jeder Katalog-Satz mit Zahl wird auch mit geänderter Zahl geprüft', () => {
  for (const e of CATALOG.filter((c) => /\d|\b(?:eines|zwei|drei|sechs|zwölf)\b/.test(c.sentence))) {
    assert.ok(NUMBER_SWAPS.some(([from]) => e.sentence.includes(from)), e.id);
  }
});

test('Invariante: ohne Katalogtreffer gibt es nur "unklar"', async () => {
  const letters = [
    ...Object.keys(expected).map((f) => read(`tests/ki-brief-check/fixtures/${f}`)),
    ...counter.cases.map((c) => c.text), ...findingsR1.sentences, ...ownR1.sentences,
    ...findingsR2.falsch, ...findingsR2.rekonstruiert, ...findingsR2.richtig, ...CATALOG.flatMap(variants),
    // Teilsätze und Zusätze: kein Teilstring-Treffer.
    ...CATALOG.flatMap((e) => [e.sentence.split(' ').slice(0, -1).join(' ') + '.', `Ich meine: ${e.sentence}`, e.sentence.replace(/\.$/, ' und mehr.')])
  ];
  for (const letter of letters) {
    for (const claim of (await analyzeLetter(letter)).claims) {
      if (claim.rating !== 'unklar') assert.ok(inCatalog.has(normalize(claim.text)), claim.text);
      else assert.match(claim.source, new RegExp(`^(?:Zum Nachlesen: .+|${NO_SOURCE})$`), claim.text);
    }
  }
});

test('Themen-Erkennung: unklar mit Paragraf zum Nachlesen und neutralem Entwurf', async () => {
  const { claims, draft } = await analyzeLetter('Zur Anfechtung des Beschlusses habe ich ein ganzes Jahr.');
  assert.deepEqual(claims.map((c) => [c.rating, c.source, c.reason]),
    [['unklar', 'Zum Nachlesen: § 45 WEG', 'Thema erkannt, Aussage im Einzelfall prüfen.']]);
  assert.match(draft, /Wir prüfen Ihren Hinweis zu „Anfechtung eines Beschlusses“ und melden uns\./);
  assert.doesNotMatch(draft, DISAGREE);
});

test('eine Anrede sperrt den Katalog nicht, eine offene Überschrift schon', async () => {
  const e = entry('anfechtung-ein-monat');
  assert.deepEqual(decided((await analyzeLetter(`Guten Tag,\n\n${e.sentence}`)).claims).length, 1);
  assert.deepEqual(decided((await analyzeLetter(`Ein Gerücht\n\n${e.sentence}`)).claims), []);
});

test('die eigenen Sperren der Einträge greifen', async () => {
  for (const [id, other] of [
    ['wallbox-kosten', 'Der Einbau wurde mit Zweidrittelmehrheit beschlossen.'],
    ['einladung-zwei-wochen', 'Es lag besondere Dringlichkeit vor.'],
    ['modernisierung-11-prozent', 'Die Ankündigung stammt von 2018.'],
    ['aufzug-nutzung', 'Die Teilungserklärung regelt das.'],
    ['sonderumlage-dagegen', 'Das Gericht hat den Beschluss aufgehoben.'],
    ['widerspruch-beschluss', 'Klage ist eingereicht.']
  ]) {
    assert.deepEqual(decided((await analyzeLetter(`${entry(id).sentence} ${other}`)).claims), [], id);
  }
});

/* ── Regressionen aus den Prüfrunden ── */
for (const [name, sentences] of [['Befund R1', findingsR1.sentences], ['Eigene Gegenprobe R1', ownR1.sentences]]) {
  for (const text of sentences) {
    test(`${name}, nur unklar: ${text}`, async () => {
      const { claims, draft } = await analyzeLetter(text);
      assert.ok(claims.length >= 1, 'kein Hinweis');
      assert.deepEqual(decided(claims), []);
      assert.doesNotMatch(draft, DISAGREE);
    });
  }
}

for (const text of [...findingsR2.falsch, ...findingsR2.rekonstruiert]) {
  test(`Befund R2 falsch, nie belegt: ${JSON.stringify(text)}`, async () => {
    const { claims, draft } = await analyzeLetter(text);
    assert.ok(claims.length >= 1, 'kein Hinweis');
    assert.deepEqual(decided(claims), []);
    for (const e of CATALOG.filter((c) => c.rating === 'belegt')) assert.ok(!draft.includes(e.reply), e.id);
  });
}

for (const text of findingsR2.richtig) {
  test(`Befund R2 richtig, nie fraglich: ${text}`, async () => {
    const { claims, draft } = await analyzeLetter(text);
    assert.ok(claims.length >= 1, 'kein Hinweis');
    assert.deepEqual(decided(claims), []);
    assert.doesNotMatch(draft, DISAGREE);
  });
}

test('es gibt genau 15 eigene Gegenproben', () => {
  assert.equal(new Set(ownR1.sentences).size, 15);
});

test('Zählung der Befund-Sätze', async (t) => {
  const count = async (list, rating) => {
    let n = 0;
    for (const text of list) if ((await analyzeLetter(text)).claims.some((c) => c.rating === rating)) n += 1;
    return n;
  };
  const wrong = [...findingsR2.falsch, ...findingsR2.rekonstruiert];
  const result = [
    [`R1 belegt (${findingsR1.sentences.length} Fassungen)`, await count(findingsR1.sentences, 'belegt')],
    [`R2 falsch belegt (${wrong.length} Briefe)`, await count(wrong, 'belegt')],
    [`R2 richtig fraglich (${findingsR2.richtig.length} Sätze)`, await count(findingsR2.richtig, 'fraglich')]
  ];
  for (const [label, n] of result) { t.diagnostic(`${label}: ${n}`); assert.equal(n, 0, label); }
  t.diagnostic(`Katalog: ${CATALOG.length} Einträge (${CATALOG.filter((e) => e.rating === 'belegt').length} belegt, ${CATALOG.filter((e) => e.rating === 'fraglich').length} fraglich); Themen: ${TOPICS.length}`);
});

test('bei fraglich widerspricht der Entwurf sachlich', async () => {
  const letter = `${entry('hausgeld-zurueck').sentence} ${entry('einladung-zwei-wochen').sentence}`;
  const { claims, draft } = await analyzeLetter(letter);
  assert.deepEqual(claims.map((c) => c.rating), ['fraglich', 'fraglich']);
  assert.equal(draft.match(/Ihrer Darstellung können wir so nicht folgen; wir prüfen den Punkt/g).length, 2);
});

test('Heizung, Wärme, Gas, Brennstoff, Warmwasser: nur unklar mit HeizkostenV', async () => {
  for (const text of [
    'Nach der HeizkostenV müssen die Heizkosten zwingend nach Verbrauch und nur zum Rest nach Wohnfläche verteilt werden.',
    'Die Warmwasserkosten sind gesetzlich zwingend nach Verbrauch und Wohnfläche umzulegen.',
    'Die Wärmekosten werden nach Miteigentumsanteilen verteilt.',
    'Die Gaskosten muss jeder nach Anteilen tragen.',
    'Die Brennstoffkosten werden nach Wohnfläche verteilt.',
    'Die Kosten der Heizanlage zahlt, wer sie nutzt.'
  ]) {
    const { claims, draft } = await analyzeLetter(text);
    assert.deepEqual(claims.map((c) => [c.rating, c.source]), [['unklar', 'Zum Nachlesen: HeizkostenV, §§ 3, 7']], text);
    assert.doesNotMatch(draft, /§ 16|Miteigentumsanteil/, text);
  }
});

test('Heizung im Brief sperrt jedes Katalog-Urteil über § 16 WEG', async () => {
  for (const e of CATALOG.filter((c) => c.source.includes('§ 16 '))) {
    for (const other of ['Die Heizung ist alt.', 'Das Gas ist teuer.', 'Es geht um Warmwasser.', 'Der Brennstoff fehlt.']) {
      const { claims, draft } = await analyzeLetter(`${e.sentence} ${other}`);
      assert.deepEqual(decided(claims), [], e.id);
      assert.equal(claims[0].source, 'Zum Nachlesen: HeizkostenV, §§ 3, 7');
      assert.doesNotMatch(draft, /§ 16/);
    }
  }
});

test('"Zum Nachlesen" trägt nie ein Urteil; fremde Paragrafen fallen weg', async () => {
  const claim = (source) => ({ text: 't', rating: 'belegt', reason: 'r', source });
  const provider = { analyze: () => ({ draft: '', claims: [claim('Zum Nachlesen: § 45 WEG'), claim('Zum Nachlesen: § 999 BGB')] }) };
  const { claims } = await analyzeLetter('x', { provider });
  assert.deepEqual(claims.map((c) => [c.rating, c.source]), [['unklar', 'Zum Nachlesen: § 45 WEG'], ['unklar', NO_SOURCE]]);
});

test('die Seite nennt die Grenze des Prototyps und zeigt "Zum Nachlesen" ohne Quellen-Vorsatz', () => {
  assert.ok(read(`${PAGE}/index.html`).includes('Der Prototyp bewertet nur bekannte Musterformulierungen; alle anderen Aussagen erscheinen als „unklar“ mit Paragraf zum Nachlesen.'));
  const doc = fakeDocument();
  const list = doc.createElement('ol');
  page.renderClaims(doc, list, [
    { text: 'a', rating: 'unklar', reason: 'r', source: 'Zum Nachlesen: § 45 WEG' },
    { text: 'b', rating: 'belegt', reason: 'r', source: '§ 45 WEG' }
  ]);
  assert.deepEqual(list.children.map((li) => li.children.at(-1).textContent), ['Zum Nachlesen: § 45 WEG', 'Quelle: § 45 WEG']);
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
