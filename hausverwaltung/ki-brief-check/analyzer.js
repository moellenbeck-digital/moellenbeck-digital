/* KI-Brief-Check: Schnittstelle zum "Modell".
 *
 * analyzeLetter(text, { provider }) -> Promise<{ claims: [{text, rating, reason, source}], draft, disclaimer }>
 *
 * Ein Provider ist ein Objekt { name, analyze(text) -> {claims, draft} | Promise }.
 * Standard ist mockProvider: regelbasiert, deterministisch, ohne Netzwerk, ohne Speicherung.
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

  const SOURCES = new Set(knowledge.RULES.flatMap((rule) => rule.source.split('; ')).filter((s) => s !== NO_SOURCE));
  const knownSource = (source) => typeof source === 'string' && source.split('; ').every((part) => SOURCES.has(part));

  class AnalyzerError extends Error {
    constructor(code, message) { super(message); this.name = 'AnalyzerError'; this.code = code; }
  }

  /* ── Sätze trennen ── */
  const ABBREVIATIONS = /(?:^|[\s(])(?:Abs|Nr|Art|Az|Urt|vgl|bzw|ggf|inkl|zzgl|ca|gem|lit|S|Str|Dr|Prof|Hr|Fr|Ziff|sog|evtl|max|min|z|B|d|h|u|a|i|V|m|o|s|f|ff)\.$/;
  const MONTH_NAMES = /^(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Werktag|Kalender)/;

  function splitSentences(text) {
    const blocks = text.replace(/\r\n?/g, '\n')
      // Aufzählungen sind eigene Einheiten; ein einfacher Zeilenumbruch sonst nicht.
      .replace(/\n(?=[ \t]*(?:[-•*]|\d{1,2}\))[ \t])/g, '\n\n')
      .split(/\n[ \t]*\n/);
    const sentences = [];
    for (const block of blocks) {
      const flat = block.replace(/\s+/g, ' ').trim();
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
    }
    return sentences.filter(Boolean);
  }

  /* ── Regeln anwenden ── */
  const NEGATION = /\b(?:nicht|nichts|nie|niemals|kein(?:e|en|em|er|es)?|weder|keinesfalls|keineswegs)\b/i;
  const HEDGE = /\?["“”)]?$|\b(?:ob|vielleicht|eventuell|m(?:ö|oe)glicherweise|vermutlich|angeblich|behaupte(?:n|t|ten)?)\b/i;

  // Schutzregeln, damit "belegt" und "fraglich" nur bei klarer Aussage stehen.
  const DENIAL = /stimmt (?:so )?nicht|trifft (?:so )?nicht zu|ist (?:so )?(?:falsch|unrichtig)|unzutreffend|irrt(?:um|ü|ue)|entgegen (?:ihrer|der|ihre[rn]) (?:behauptung|ansicht|auffassung|darstellung)/i;
  const REVERSAL = /\b(?:unm(?:ö|oe)glich|unzul(?:ä|ae)ssig|falsch)\b/i;

  function doubt(rule, sentence) {
    if (HEDGE.test(sentence)) return 'Als Frage oder Vermutung formuliert. Bitte im Einzelfall prüfen.';
    if (DENIAL.test(sentence) || (rule.deny && rule.deny.test(sentence))
      || (!rule.negation && (NEGATION.test(sentence) || REVERSAL.test(sentence)))) {
      return 'Der Satz enthält eine Verneinung oder Einschränkung. Die Aussage lässt sich nicht sicher zuordnen.';
    }
    return null;
  }

  /* ── Sperrfilter für "belegt" (gilt für alle Regeln). Ein falsches "belegt" ist schlimmer als ein "unklar". ── */
  const BLOCKERS = [
    ['eine Verneinung oder Gegenrichtung', /\b(?:nicht|nichts|nie|niemals|kein\w*|weder|ohne|keinesfalls|keineswegs|statt|anstatt)\b|verweiger|verbiet|verbot|ablehn|abgelehnt|untersag|entfern|r(?:ü|ue)ckbau|beseitig|unterlass|unm(?:ö|oe)glich|unzul(?:ä|ae)ssig|falsch|ausgeschlossen/i],
    ['eine Einschränkung oder Ausweitung', /\b(?:nur|ausschlie(?:ß|ss)lich|lediglich|allein|fr(?:ü|ue)hestens|h(?:ö|oe)chstens|sp(?:ä|ae)testens|mindestens|jede[rnms]?|alle[rnms]?|s(?:ä|ae)mtlich\w*|auch|erst|immer|stets|ausnahmslos|zwingend|unbegrenzt|uneingeschr(?:ä|ae)nkt|beliebig|sofort|automatisch|jederzeit)\b|in jedem fall|auf jeden fall/i],
    ['einen abweichenden Zeitbezug', /\bnach\b|\bzu (?:sp(?:ä|ae)t|fr(?:ü|ue)h|lang|kurz|hoch|niedrig)|versp(?:ä|ae)tet|abgelaufen|vers(?:ä|ae)umt/i],
    ['eine Bedingung oder weitere Forderung', /\b(?:wenn|falls|sofern|soweit|aber|jedoch|obwohl|weil|deshalb|daher|deswegen|somit|folglich|sowie)\b|\bund (?:ich|wir|auch|auf|damit|darf|werde)\b|schadens?ersatz|entsch(?:ä|ae)dig|erstatt/i]
  ];
  const ROLES = {
    mieter: /\bmieter(?!h(?:ö|oe)h)/i, vermieter: /vermieter/i, eigentuemer: /eigent(?:ü|ue)mer/i,
    verwalter: /verwalter/i, gemeinschaft: /gemeinschaft(?!lich)/i, beirat: /beirat|beir(?:ä|ae)te/i, nachbar: /nachbar/i
  };
  const NUMBER_WORDS = { null: 0, ein: 1, zwei: 2, drei: 3, vier: 4, 'fünf': 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, 'zwölf': 12, zwoelf: 12, vierzehn: 14 };
  const NUMBERS = /\d+(?:[.,]\d+)?|\b(?:null|zwei(?:er|ten?)?|drei|vier|vierzehn|f(?:ü|ue)nf|sechs|sieben|acht|neun|zehn|elf|zw(?:ö|oe)lf(?:ten?)?)\b|\bein(?:es|em|en|er|e)?(?=[ -](?:monat(?:s|e|en)?|wochen?|jahr(?:es|e|en)?|tage?n?|euro|prozent)(?![a-zäöüß]))/gi;
  const SECTION = /§§? ?\d+[a-z]?(?: (?:Abs\.?|Satz|S\.) ?\d+[a-z]?)*/gi;

  function numberValue(token) {
    const word = token.toLowerCase();
    if (/^\d/.test(word)) return Number(word.replace(',', '.'));
    if (word in NUMBER_WORDS) return NUMBER_WORDS[word];
    const stem = word.replace(/(?:es|em|en|er|e|ten?)$/, '');
    return stem in NUMBER_WORDS ? NUMBER_WORDS[stem] : NaN;
  }

  // null = kein Sperrsignal, sonst die Begründung für "unklar".
  function blockReason(rule, sentence) {
    const why = doubt({ negation: true }, sentence);
    if (why) return why;
    // Wortlaut der Regel selbst ("nach der Beschlussfassung", "mindestens") zählt nicht als Sperrsignal.
    const rest = (rule.allow || []).reduce((s, re) => s.replace(new RegExp(re.source, 'gi'), ' '), sentence);
    const blocker = BLOCKERS.find(([, re]) => re.test(rest));
    if (blocker) return `Der Satz enthält ${blocker[0]}. Eine Bestätigung ist so nicht möglich. Bitte im Einzelfall prüfen.`;
    if (rule.foreign.some((role) => ROLES[role].test(sentence))) {
      return 'Der Satz nennt eine Rolle, für die diese Vorschrift die Aussage nicht trägt. Bitte im Einzelfall prüfen.';
    }
    return null;
  }

  const verdict = (rule, rating, reason, reply) => ({ topic: rule.topic, label: rule.label, rating, source: rule.source, reason, reply });

  // "belegt" nur, wenn der ganze Satz eine enge Form trifft, kein Sperrsignal enthält und jede Zahl stimmt.
  function assessSupported(rule, sentence) {
    let match = null;
    for (const re of rule.forms) if ((match = re.exec(sentence))) break;
    if (!match) {
      // "soft": jedes andere Urteil zum selben Thema geht vor.
      return Object.assign(unsure(rule, 'Der Satz berührt dieses Thema, entspricht aber keiner eng geprüften Aussage. Bitte im Einzelfall prüfen.'), { soft: true });
    }
    const blocked = blockReason(rule, sentence);
    if (blocked) return unsure(rule, blocked);
    if (Object.entries(match.groups || {}).some(([name, token]) => numberValue(token) !== rule.slots[name])) {
      return verdict(rule, 'fraglich', rule.wrong.reason, rule.wrong.reply);
    }
    const numbers = sentence.replace(SECTION, ' ').match(NUMBERS) || [];
    if (!numbers.every((token) => rule.numbers.includes(numberValue(token)))) {
      return unsure(rule, 'Der Satz nennt eine Zahl, die nicht zum Wortlaut der Vorschrift passt. Bitte im Einzelfall prüfen.');
    }
    return verdict(rule, 'belegt', rule.reason, rule.reply);
  }

  function unsure(rule, why) {
    return {
      topic: rule.topic, label: rule.label, rating: 'unklar', source: rule.source, reason: why,
      reply: 'Diesen Punkt prüfen wir anhand der Unterlagen und kommen darauf zurück.'
    };
  }

  function assessSentence(sentence) {
    const hits = [];
    for (const rule of knowledge.RULES) {
      if (!rule.when.every((re) => re.test(sentence))) continue;
      if (rule.unless && rule.unless.some((re) => re.test(sentence))) continue;
      if (rule.rating === 'belegt') {
        hits.push(assessSupported(rule, sentence));
        continue;
      }
      const why = rule.rating === 'unklar' ? null : doubt(rule, sentence);
      hits.push(why ? unsure(rule, why) : verdict(rule, rule.rating, rule.reason, rule.reply));
    }
    // Ein Thema, ein Urteil: widersprechen sich Regeln, gilt "unklar".
    const topics = new Map();
    for (const hit of hits) {
      const previous = topics.get(hit.topic);
      if (!previous || (previous.soft && !hit.soft)) topics.set(hit.topic, hit);
      else if (!hit.soft && previous.rating !== hit.rating) {
        topics.set(hit.topic, unsure(previous, 'Der Satz enthält widersprüchliche oder mehrere Angaben zu diesem Thema.'));
      }
    }
    const result = [...topics.values()];

    // Zitierte Urteile werden nie bestätigt: auch nicht zusammen mit einer passenden Regel.
    if (knowledge.CASE_LAW.test(sentence)) {
      return [{
        topic: 'urteil:' + sentence, label: 'Zitiertes Urteil', rating: 'unklar', source: NO_SOURCE,
        reason: 'Der Satz nennt Rechtsprechung. Dieser Prototyp prüft keine Urteile. Fundstelle in einer amtlichen oder verlässlichen Quelle nachschlagen, bevor sie verwendet wird.',
        reply: 'Die von Ihnen genannte Rechtsprechung prüfen wir, bevor wir dazu Stellung nehmen.'
      }].concat(result.map((hit) => (hit.rating === 'belegt'
        ? unsure(hit, 'Die Aussage stützt sich auf ein nicht geprüftes Urteil.') : hit)));
    }
    if (!result.length && knowledge.LEGAL_SIGNAL.test(sentence)) {
      result.push({
        topic: 'offen:' + sentence, label: 'Weiterer Punkt', rating: 'unklar', source: NO_SOURCE,
        reason: 'Der Satz klingt nach einer Rechtsbehauptung. Dafür gibt es keine passende Regel. Bitte manuell prüfen.',
        reply: 'Diesen Punkt prüfen wir anhand der Unterlagen und kommen darauf zurück.'
      });
    }
    return result;
  }

  const CONTRADICTION = 'Ihrer Darstellung können wir so nicht folgen; wir prüfen den Punkt für Ihren Fall.';

  /* ── Antwortentwurf: nur Platzhalter und geprüfte Textbausteine, nie Text aus dem Brief ── */
  function buildDraft(findings) {
    const lines = [
      'Betreff: Ihr Schreiben vom [Datum] – [Objekt]',
      '',
      'Guten Tag [Name],',
      '',
      'vielen Dank für Ihr Schreiben zum Objekt [Objekt].'
    ];
    // Je Thema ein Absatz; unterschiedliche Urteile zum selben Thema im Brief ergeben "prüfen wir".
    const topics = new Map();
    for (const f of findings) {
      const key = f.topic.startsWith('offen:') ? 'offen' : f.topic.startsWith('urteil:') ? 'urteil' : f.topic;
      const previous = topics.get(key);
      if (!previous) topics.set(key, f);
      else if (previous.rating !== f.rating) topics.set(key, unsure(previous, ''));
    }
    if (!topics.size) {
      lines.push('', 'Wir prüfen Ihr Anliegen und melden uns bis zum [Datum] bei Ihnen.');
    } else {
      lines.push('Zu den angesprochenen Punkten:');
      let n = 0;
      for (const f of topics.values()) {
        lines.push('', `${++n}. ${f.label}`, f.rating === 'fraglich' ? `${CONTRADICTION} ${f.reply}` : f.reply);
      }
      lines.push('', 'Weitere Rückfragen klären wir gern. Eine Rückmeldung zu offenen Punkten erhalten Sie bis zum [Datum].');
    }
    lines.push('', 'Mit freundlichen Grüßen', '[Name Sachbearbeitung]', '[Verwaltung]');
    return lines.join('\n');
  }

  const mockProvider = Object.freeze({
    name: 'mock',
    analyze(text) {
      const seen = new Set();
      const findings = [];
      for (const sentence of splitSentences(text)) {
        for (const hit of assessSentence(sentence)) {
          const key = hit.topic + '|' + hit.rating + '|' + sentence;
          if (seen.has(key)) continue;
          seen.add(key);
          findings.push(Object.assign({ text: sentence }, hit));
        }
      }
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
      const source = knownSource(claim.source) ? claim.source : NO_SOURCE;
      return {
        text: String(claim.text || ''),
        rating: source !== NO_SOURCE && RATINGS.includes(claim.rating) ? claim.rating : 'unklar',
        reason: String(claim.reason || ''),
        source
      };
    });
    return { claims, draft: raw.draft, disclaimer: DISCLAIMER };
  }

  return Object.freeze({
    analyzeLetter, mockProvider, remoteProvider, splitSentences, AnalyzerError,
    MAX_LENGTH, RATINGS, DISCLAIMER, NO_SOURCE
  });
}));
