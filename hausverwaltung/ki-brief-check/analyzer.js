/* KI-Brief-Check: Schnittstelle zum "Modell".
 *
 * analyzeLetter(text, { provider }) -> Promise<{ claims: [{text, rating, reason, source}], draft, disclaimer }>
 *
 * Ein Provider ist ein Objekt { name, analyze(text) -> {claims, draft} | Promise }.
 * Standard ist mockProvider: deterministisch, ohne Netzwerk, ohne Speicherung. Er urteilt nicht frei:
 *   1. Katalog: "belegt" und "fraglich" nur bei ganzem bekanntem Satz und ohne Kontextsperre.
 *   2. Themen-Erkennung: alles andere ist "unklar" mit Paragraf zum Nachlesen.
 * remoteProvider ist ein Platzhalter ohne Endpunkt und ohne Schlüssel.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./knowledge.js'));
  else root.KiBriefCheck = factory(root.KiBriefKnowledge);
}(typeof self !== 'undefined' ? self : this, function (knowledge) {
  'use strict';

  const MAX_LENGTH = 8000;
  const RATINGS = Object.freeze(['belegt', 'fraglich', 'unklar']);
  const DISCLAIMER = 'Hinweise mit Quelle, kein Rechtsrat. Das Ergebnis ersetzt keine anwaltliche Prüfung.';
  const NO_SOURCE = 'keine Quelle in der Wissensbasis';

  const READ_UP = 'Zum Nachlesen: ';
  const TOPIC_REASON = 'Thema erkannt, Aussage im Einzelfall prüfen.';

  // Quellen-Allowlist: Paragrafen aus dem Katalog tragen ein Urteil, "Zum Nachlesen" nur "unklar".
  const parts = (list) => list.flatMap((entry) => entry.source.split('; '));
  const CATALOG_SOURCES = new Set(parts(knowledge.CATALOG));
  const READ_UP_SOURCES = new Set([...CATALOG_SOURCES, ...parts(knowledge.TOPICS)]);
  const allKnown = (source, set) => source.split('; ').every((part) => set.has(part));

  class AnalyzerError extends Error {
    constructor(code, message) { super(message); this.name = 'AnalyzerError'; this.code = code; }
  }

  /* ── Sätze trennen ── */
  const ABBREVIATIONS = /(?:^|[\s(])(?:Abs|Nr|Art|Az|Urt|vgl|bzw|ggf|inkl|zzgl|ca|gem|lit|S|Str|Dr|Prof|Hr|Fr|Ziff|sog|evtl|max|min|z|B|d|h|u|a|i|V|m|o|s|f|ff)\.$/;
  const MONTH_NAMES = /^(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Werktag|Kalender)/i;

  // Zeilen und Absätze sind kein Satzende: ohne Satzzeichen gehört der Text zusammen.
  // Einzige Ausnahme ist eine Anrede in der ersten Zeile.
  const SALUTATION = /^\s*((?:Sehr geehrte[rs]?|Guten (?:Tag|Morgen|Abend)|Hallo|Liebe[rs]?)(?:[ \t]+[^\s,.!?:;]+){0,5},)[ \t]*\n/;

  function splitSentences(text) {
    const sentences = [];
    let body = text.replace(/\r\n?/g, '\n');
    const salutation = SALUTATION.exec(body);
    if (salutation) {
      sentences.push(salutation[1]);
      body = body.slice(salutation[0].length);
    }
    const flat = body.replace(/\s+/g, ' ').trim();
    let start = 0;
    const end = /[.!?]+["“”)]?(?= |$)/g;
    let match;
    while ((match = end.exec(flat))) {
      const stop = match.index + match[0].length;
      const head = flat.slice(Math.max(start, match.index - 12), match.index + 1);
      const rest = flat.slice(stop + 1, stop + 14);
      if (match[0] === '.') {
        if (ABBREVIATIONS.test(head)) continue;
        if (/(?:^|\s)\d{1,2}\.$/.test(head) && MONTH_NAMES.test(rest)) continue; // "am 3. Mai"
        if (/^[a-zäöü§]/.test(rest)) continue;
      }
      sentences.push(flat.slice(start, stop).trim());
      start = stop;
    }
    sentences.push(flat.slice(start).trim());
    return sentences.filter(Boolean);
  }

  /* ── Stufe 1: Katalog (ganzer Satz) ── */
  // Nur Schreibweise: Groß/klein, Leerraum, Satz- und Anführungszeichen. Zwischen Ziffern bleiben Zeichen stehen.
  function normalize(sentence) {
    return sentence.normalize('NFC').toLowerCase()
      .replace(/(?<!\d)[.,:\-–—](?!\d)|(?<=\d)[.,:\-–—](?!\d)|(?<!\d)[.,:\-–—](?=\d)|[;!?"'„“”‚‘’«»‹›()\[\]•*…]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  const CATALOG = new Map(knowledge.CATALOG.map((entry) => [normalize(entry.sentence), entry]));

  // null = keine Sperre, sonst { why, source }.
  function contextLock(entry, sentences, index) {
    const others = sentences.filter((_, i) => i !== index).join(' ');
    const locked = (why, source) => ({ why, source: source || entry.source });
    if (/\?["“”)]*$/.test(sentences[index])) return locked('Der Satz ist als Frage formuliert.');
    if (entry.source.includes('§ 16 ') && knowledge.HEATING.test(others)) {
      return locked('Der Brief nennt Heizung oder Warmwasser.', knowledge.HEATING_SOURCE);
    }
    if (knowledge.AREA_FOREIGN[entry.area].test(others)) return locked('Der Brief berührt einen anderen Rechtsbereich.');
    const denies = sentences.some((s, i) => i !== index && !CATALOG.has(normalize(s))
      && knowledge.NEGATION.test(s) && knowledge.REFERENCE.test(s));
    if (denies || knowledge.CONTRADICTION.test(others) || knowledge.BACK_REFERENCE.test(sentences[index + 1] || '')) {
      return locked('Ein anderer Satz im Brief schränkt ein oder widerspricht möglicherweise.');
    }
    if (entry.lock && entry.lock.test(others)) return locked('Der Brief nennt Umstände, die das Ergebnis ändern können.');
    return null;
  }

  const neutral = (label) => `Wir prüfen Ihren Hinweis zu „${label}“ und melden uns.`;
  const unsure = (topic, label, source, reason) => ({ topic, label, rating: 'unklar', source, reason, reply: neutral(label) });

  /* ── Stufe 2: Themen-Erkennung, immer "unklar" ── */
  function assessSentence(sentences, index) {
    const sentence = sentences[index];
    const entry = CATALOG.get(normalize(sentence));
    if (entry) {
      const lock = contextLock(entry, sentences, index);
      if (lock) return unsure(entry.topic, entry.label, READ_UP + lock.source, `${TOPIC_REASON} ${lock.why}`);
      const { topic, label, rating, source, reason, reply } = entry;
      return { topic, label, rating, source, reason, reply };
    }
    // Zitierte Urteile werden nie bewertet.
    if (knowledge.CASE_LAW.test(sentence)) {
      return Object.assign(unsure('urteil', 'Zitiertes Urteil', NO_SOURCE,
        'Der Satz nennt Rechtsprechung. Dieser Prototyp prüft keine Urteile. Fundstelle in einer amtlichen oder verlässlichen Quelle nachschlagen, bevor sie verwendet wird.'),
      { reply: 'Die von Ihnen genannte Rechtsprechung prüfen wir, bevor wir dazu Stellung nehmen.' });
    }
    const found = knowledge.TOPICS.find((t) => t.when.every((re) => re.test(sentence)));
    if (found) return unsure(found.id, found.label, READ_UP + found.source, TOPIC_REASON);
    if (knowledge.LEGAL_SIGNAL.test(sentence)) {
      return unsure('offen', 'Weiterer Punkt', NO_SOURCE,
        'Der Satz klingt nach einer Rechtsbehauptung. Dafür ist kein Thema hinterlegt. Bitte manuell prüfen.');
    }
    return null;
  }

  const DISAGREE = 'Ihrer Darstellung können wir so nicht folgen; wir prüfen den Punkt für Ihren Fall.';

  /* ── Antwortentwurf: nur Platzhalter und geprüfte Textbausteine, nie Text aus dem Brief ── */
  function buildDraft(findings) {
    const lines = [
      'Betreff: Ihr Schreiben vom [Datum] – [Objekt]',
      '',
      'Guten Tag [Name],',
      '',
      'vielen Dank für Ihr Schreiben zum Objekt [Objekt].'
    ];
    // Je Thema ein Absatz. Nur wenn alle Urteile eines Themas gleich sind, bleiben die Katalog-Bausteine;
    // sonst antwortet der Entwurf neutral.
    const topics = new Map();
    for (const f of findings) topics.set(f.topic, (topics.get(f.topic) || []).concat(f));
    if (!topics.size) {
      lines.push('', 'Wir prüfen Ihr Anliegen und melden uns bis zum [Datum] bei Ihnen.');
    } else {
      lines.push('Zu den angesprochenen Punkten:');
      let n = 0;
      for (const list of topics.values()) {
        const [first] = list;
        const agreed = list.every((f) => f.rating === first.rating);
        const replies = agreed ? [...new Set(list.map((f) => f.reply))] : [neutral(first.label)];
        if (agreed && first.rating === 'fraglich') replies.unshift(DISAGREE);
        lines.push('', `${++n}. ${first.label}`, replies.join(' '));
      }
      lines.push('', 'Weitere Rückfragen klären wir gern. Eine Rückmeldung zu offenen Punkten erhalten Sie bis zum [Datum].');
    }
    lines.push('', 'Mit freundlichen Grüßen', '[Name Sachbearbeitung]', '[Verwaltung]');
    return lines.join('\n');
  }

  const mockProvider = Object.freeze({
    name: 'mock',
    analyze(text) {
      const sentences = splitSentences(text);
      const seen = new Set();
      const findings = [];
      sentences.forEach((sentence, index) => {
        const hit = assessSentence(sentences, index);
        if (!hit || seen.has(sentence)) return;
        seen.add(sentence);
        findings.push(Object.assign({ text: sentence }, hit));
      });
      return {
        claims: findings.map(({ text: t, rating, reason, source }) => ({ text: t, rating, reason, source })),
        draft: buildDraft(findings)
      };
    }
  });

  // Platzhalter für ein echtes Modell. Absichtlich ohne Netzwerkcode: Endpunkt, Vertrag zur
  // Auftragsverarbeitung und Backend fehlen noch.
  const remoteProvider = Object.freeze({
    name: 'remote',
    analyze() {
      throw new AnalyzerError('NOT_CONFIGURED', 'remoteProvider ist nicht konfiguriert.');
    }
  });

  async function analyzeLetter(text, options) {
    const provider = (options && options.provider) || mockProvider;
    if (typeof text !== 'string' || !text.trim()) {
      throw new AnalyzerError('EMPTY', 'Bitte fügen Sie zuerst den Brieftext ein.');
    }
    if (text.length > MAX_LENGTH) {
      throw new AnalyzerError('TOO_LONG', `Der Text ist zu lang (höchstens ${MAX_LENGTH} Zeichen). Bitte kürzen Sie ihn.`);
    }
    const raw = await provider.analyze(text);
    if (!raw || !Array.isArray(raw.claims) || typeof raw.draft !== 'string') {
      throw new AnalyzerError('BAD_RESPONSE', 'Der Provider lieferte kein gültiges Ergebnis.');
    }
    // Auch ein späteres Modell darf nur die drei Urteile und nur Quellen der Wissensbasis liefern.
    // Ohne anerkannte Quelle gilt "unklar".
    const claims = raw.claims.map((claim) => {
      const given = typeof claim.source === 'string' ? claim.source : '';
      const readUp = given.startsWith(READ_UP) && allKnown(given.slice(READ_UP.length), READ_UP_SOURCES);
      const cited = allKnown(given, CATALOG_SOURCES);
      return {
        text: String(claim.text || ''),
        rating: cited && RATINGS.includes(claim.rating) ? claim.rating : 'unklar',
        reason: String(claim.reason || ''),
        source: cited || readUp ? given : NO_SOURCE
      };
    });
    return { claims, draft: raw.draft, disclaimer: DISCLAIMER };
  }

  return Object.freeze({
    analyzeLetter, mockProvider, remoteProvider, splitSentences, AnalyzerError,
    MAX_LENGTH, RATINGS, DISCLAIMER, NO_SOURCE, normalize
  });
}));
