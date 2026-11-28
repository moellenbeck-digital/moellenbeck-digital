/* KI-Brief-Check: kuratierte Wissensbasis (Prototyp).
 *
 * NICHT JURISTISCH GEPRÜFT. Vor einem Livegang prüft eine Juristin oder ein Jurist jeden Eintrag.
 * Paragrafen abgeglichen mit dem Wortlaut auf gesetze-im-internet.de (WEG, BGB, HeizkostenV), Abruf 28.11.2026.
 * Rechtsprechung ist bewusst nicht Teil der Wissensbasis.
 *
 * Zwei Stufen:
 *   CATALOG  Kanonische Sätze mit festem Urteil. Treffer nur, wenn der ganze Satz nach Normalisierung gleich ist.
 *            Nur der Katalog liefert "belegt" oder "fraglich". Er bewertet die behauptete Regel, nicht den Einzelfall.
 *   TOPICS   Stichwörter für alle anderen Sätze. Ergebnis immer "unklar" mit Paragraf zum Nachlesen.
 *
 * Katalog-Eintrag:
 *   id, topic, label (Thema im Antwortentwurf), area ('weg' oder 'miete'),
 *   sentence, rating, source, reason, reply
 *   lock   optional: kommt dieses Muster irgendwo sonst im Brief vor, gilt "unklar".
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KiBriefKnowledge = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const AGREEMENT = /teilungserkl|gemeinschaftsordnung|vereinbar/i;
  const NULLIFIED = /nichtig|ung(?:ü|ue)ltig erkl|f(?:ü|ue)r ung(?:ü|ue)ltig|aufgehoben/i;
  const COURT = /klage|gericht/i;
  const OLD_LAW = /a\.? ?F\.|alte[nrs]? (?:fassung|recht|gesetz)|fr(?:ü|ue)her|\b(?:19\d\d|200\d|201[0-8])\b/i;

  // Umstände in einem anderen Satz, die ein "fraglich" tragfähig widerlegen können. Im Zweifel "unklar".
  const either = (...patterns) => new RegExp(patterns.map((p) => p.source).join('|'), 'i');
  const RESOLUTION = /beschl(?:u(?:ss|ß)|ü(?:ss|ß)|oss|ie(?:ß|ss))/i;
  // § 21 WEG: Mehrheit, Amortisation oder abweichender Beschluss. "kein(en) Beschluss" sperrt nicht.
  const COST_RESOLVED = /mehrheit|zwei ?drittel|2\/3|amortis|alle (?:wohnungs)?eigent|beschlossen|einstimmig|(?<!\bkein(?:e[nms]?)? )beschl(?:u(?:ss|ß)|ü(?:ss|ß))|kosten(?:ü|ue)bernahme|vereinbar/i;
  const URGENT = /dringlich|dringend|eilbed|eilig|notfall/i;
  const COPIES_PROMISED = /verwalt(?:er|ungs)vertrag|zugesagt|zugesicher|zusage|zusicherung/i;
  // § 536c Abs. 2 BGB: Der Vermieter kann den Mangel schon kennen.
  const DEFECT_KNOWN = /angezeigt|gemeldet|bekannt|wu(?:ss|ß)te|kannte|gewu(?:ss|ß)t|(?<![a-zäöüß])(?:wei(?:ß|ss)t?|wissen|wisst)(?![a-zäöüß])|bescheid|informier|besichtig|kenntnis|hausmeister.{0,300}?aufgenommen|aufgenommen.{0,300}?hausmeister/i;

  const CATALOG = [
    /* ───── Wohnungseigentum ───── */
    {
      id: 'hausgeld-zurueck', topic: 'hausgeld', label: 'Zahlung des Hausgelds', area: 'weg',
      sentence: 'Ich halte das Hausgeld ab sofort in voller Höhe zurück, bis die offenen Fragen geklärt sind.',
      rating: 'fraglich', source: '§ 28 Abs. 1 WEG; § 16 Abs. 2 WEG',
      reason: 'Die Vorschüsse beruhen auf einem Beschluss der Wohnungseigentümer. Ein Recht, sie bis zur Klärung offener Fragen zurückzuhalten, ergibt sich aus diesen Vorschriften nicht.',
      reply: 'Die Vorschüsse zum Hausgeld haben die Wohnungseigentümer beschlossen (§ 28 Abs. 1 WEG). Ein Recht, die Zahlung einseitig zurückzuhalten, ergibt sich daraus nach unserem Verständnis nicht. Wir bitten Sie, fristgerecht weiterzuzahlen. Ihre Fragen beantworten wir gesondert.'
    },
    {
      id: 'aufzug-nutzung', topic: 'kosten', label: 'Kosten bei fehlender Nutzung', area: 'weg', lock: either(AGREEMENT, RESOLUTION),
      sentence: 'Den Aufzug nutze ich nicht, deshalb muss ich mich an dessen Kosten auch nicht beteiligen.',
      rating: 'fraglich', source: '§ 16 Abs. 2 WEG',
      reason: 'Nach dem gesetzlichen Grundsatz trägt jeder Wohnungseigentümer die Kosten nach seinem Anteil, unabhängig von der Nutzung. Eine abweichende Verteilung braucht eine Vereinbarung oder einen Beschluss.',
      reply: 'Die Pflicht, Kosten des gemeinschaftlichen Eigentums mitzutragen, hängt nach § 16 Abs. 2 WEG grundsätzlich nicht von der persönlichen Nutzung ab. Wir prüfen, ob eine abweichende Vereinbarung oder ein Beschluss besteht.'
    },
    {
      id: 'einsicht-unterlagen', topic: 'einsicht', label: 'Einsicht in die Verwaltungsunterlagen', area: 'weg',
      sentence: 'Als Wohnungseigentümer habe ich das Recht, Einsicht in die Verwaltungsunterlagen zu nehmen.',
      rating: 'belegt', source: '§ 18 Abs. 4 WEG',
      reason: 'Jeder Wohnungseigentümer kann von der Gemeinschaft der Wohnungseigentümer Einsicht in die Verwaltungsunterlagen verlangen. Der Anspruch richtet sich an die Gemeinschaft.',
      reply: 'Sie können Einsicht in die Verwaltungsunterlagen verlangen (§ 18 Abs. 4 WEG). Wir stimmen mit Ihnen einen Termin ab: [Terminvorschlag].'
    },
    {
      id: 'abrechnung-31-maerz', topic: 'jahresabrechnung', label: 'Frist für die Jahresabrechnung', area: 'weg',
      sentence: 'Nach dem Gesetz muss die Jahresabrechnung spätestens bis zum 31. März vorliegen.',
      rating: 'fraglich', source: '§ 28 Abs. 2 WEG',
      reason: '§ 28 Abs. 2 WEG nennt keinen festen Termin für die Jahresabrechnung. Ein Termin kann sich aus Vertrag oder Beschluss ergeben; das ist gesondert zu prüfen.',
      reply: '§ 28 Abs. 2 WEG nennt keinen festen Termin für die Jahresabrechnung. Ob für [Objekt] ein Termin vereinbart oder beschlossen ist, prüfen wir und nennen Ihnen den Stand: [Stand].'
    },
    {
      id: 'sonderumlage-alle', topic: 'sonderumlage', label: 'Sonderumlage', area: 'weg', lock: AGREEMENT,
      sentence: 'Die auf der letzten Versammlung beschlossene Sonderumlage ist ohne die Zustimmung aller Eigentümer unwirksam.',
      rating: 'fraglich', source: '§ 28 Abs. 1 WEG; § 25 Abs. 1 WEG',
      reason: 'Über Vorschüsse beschließen die Wohnungseigentümer. Bei der Beschlussfassung entscheidet die Mehrheit der abgegebenen Stimmen.',
      reply: 'Über Vorschüsse, zu denen auch eine Sonderumlage zählt, beschließen die Wohnungseigentümer (§ 28 Abs. 1 WEG). Es entscheidet die Mehrheit der abgegebenen Stimmen (§ 25 Abs. 1 WEG). Die Zustimmung aller ist danach nicht erforderlich, soweit Ihre Gemeinschaftsordnung nichts anderes regelt.'
    },
    {
      id: 'sonderumlage-dagegen', topic: 'sonderumlage-bindung', label: 'Bindung an den Beschluss zur Sonderumlage', area: 'weg', lock: NULLIFIED,
      sentence: 'Ich habe gegen die Sonderumlage gestimmt und muss sie deshalb nicht bezahlen.',
      rating: 'fraglich', source: '§ 23 Abs. 4 WEG; § 16 Abs. 2 WEG',
      reason: 'Ein Beschluss ist gültig, solange er nicht durch rechtskräftiges Urteil für ungültig erklärt ist (Ausnahme: nichtige Beschlüsse). Eine Gegenstimme befreit nach diesen Vorschriften nicht von der Zahlung.',
      reply: 'Ein gefasster Beschluss ist gültig, solange er nicht durch rechtskräftiges Urteil für ungültig erklärt ist; ausgenommen sind nichtige Beschlüsse (§ 23 Abs. 4 WEG). Eine Gegenstimme lässt die Zahlungspflicht nach unserem Verständnis nicht entfallen.'
    },
    {
      id: 'anfechtung-ein-monat', topic: 'anfechtung', label: 'Frist der Anfechtungsklage', area: 'weg',
      sentence: 'Die Anfechtungsklage muss innerhalb eines Monats nach der Beschlussfassung erhoben werden.',
      rating: 'belegt', source: '§ 45 WEG',
      reason: 'Die Anfechtungsklage muss innerhalb eines Monats nach der Beschlussfassung erhoben und innerhalb zweier Monate nach der Beschlussfassung begründet werden. Die §§ 233 bis 238 der Zivilprozessordnung gelten entsprechend.',
      reply: 'Die Anfechtungsklage muss innerhalb eines Monats nach der Beschlussfassung erhoben und innerhalb zweier Monate nach der Beschlussfassung begründet werden (§ 45 WEG).'
    },
    {
      id: 'wallbox-gestattung', topic: 'bauliche-veraenderung', label: 'Bauliche Veränderung', area: 'weg',
      sentence: 'Ich habe als Eigentümer Anspruch darauf, dass mir der Einbau einer Wallbox an meinem Stellplatz gestattet wird.',
      rating: 'belegt', source: '§ 20 Abs. 2 WEG',
      reason: 'Jeder Wohnungseigentümer kann angemessene bauliche Veränderungen verlangen, die dem Laden elektrisch betriebener Fahrzeuge dienen. Über die Durchführung ist zu beschließen; Grenzen setzt § 20 Abs. 4 WEG. Die Kosten regelt § 21 WEG.',
      reply: 'Für das Laden elektrisch betriebener Fahrzeuge sieht § 20 Abs. 2 WEG einen Anspruch auf angemessene bauliche Veränderungen vor. Über die Durchführung beschließen die Wohnungseigentümer. Wir bereiten dazu einen Tagesordnungspunkt vor und benötigen von Ihnen eine Beschreibung des Vorhabens.'
    },
    {
      id: 'wallbox-kosten', topic: 'bau-kosten', label: 'Kosten der baulichen Veränderung', area: 'weg',
      lock: COST_RESOLVED,
      sentence: 'Die Kosten für die Wallbox muss die Gemeinschaft tragen.',
      rating: 'fraglich', source: '§ 21 Abs. 1 WEG',
      reason: 'Die Kosten einer baulichen Veränderung, die einem Wohnungseigentümer gestattet oder auf sein Verlangen durchgeführt wird, hat dieser Eigentümer zu tragen.',
      reply: 'Die Kosten einer baulichen Veränderung, die einem Wohnungseigentümer gestattet oder auf sein Verlangen durchgeführt wird, trägt dieser Eigentümer (§ 21 Abs. 1 WEG).'
    },
    {
      id: 'widerspruch-beschluss', topic: 'anfechtung-form', label: 'Form der Anfechtung', area: 'weg', lock: COURT,
      sentence: 'Hiermit lege ich Widerspruch gegen den Beschluss zur Fassadenfarbe ein.',
      rating: 'fraglich', source: '§ 44 Abs. 1 WEG; § 45 WEG',
      reason: 'Ein Beschluss wird durch eine Klage beim Gericht angefochten. Ein Widerspruch an die Verwaltung wahrt die Klagefrist nicht.',
      reply: 'Ein Beschluss lässt sich nur durch eine Klage beim Gericht angreifen (§ 44 Abs. 1 WEG). Ein Schreiben an die Verwaltung wahrt die Klagefrist von einem Monat nicht (§ 45 WEG).'
    },
    {
      id: 'anfechtung-zwei-monate', topic: 'anfechtung', label: 'Frist der Anfechtungsklage', area: 'weg',
      lock: /begr(?:ü|ue)nd/i,
      sentence: 'Für die Anfechtung habe ich zwei Monate Zeit.',
      rating: 'fraglich', source: '§ 45 WEG',
      reason: 'Die Anfechtungsklage ist innerhalb eines Monats nach der Beschlussfassung zu erheben. Zwei Monate gelten nur für die Begründung.',
      reply: 'Die Anfechtungsklage muss innerhalb eines Monats nach der Beschlussfassung erhoben werden; die Frist von zwei Monaten gilt nur für die Begründung (§ 45 WEG).'
    },
    {
      id: 'anfechtung-protokoll', topic: 'anfechtung', label: 'Frist der Anfechtungsklage', area: 'weg',
      lock: /wiedereinsetzung/i,
      sentence: 'Die Frist beginnt bei der Anfechtung erst mit Zugang des Protokolls.',
      rating: 'fraglich', source: '§ 45 WEG',
      reason: 'Die Fristen laufen ab der Beschlussfassung, nicht ab Zugang der Niederschrift.',
      reply: 'Die Fristen für Klage und Begründung rechnen ab der Beschlussfassung, nicht ab dem Zugang des Protokolls (§ 45 WEG).'
    },
    {
      id: 'kopien-kostenlos', topic: 'einsicht-kopien', label: 'Zusendung von Kopien', area: 'weg',
      lock: either(AGREEMENT, RESOLUTION, COPIES_PROMISED),
      sentence: 'Ich habe Anspruch darauf, dass mir die Verwaltung kostenlos Kopien aller Verwaltungsunterlagen zusendet.',
      rating: 'fraglich', source: '§ 18 Abs. 4 WEG',
      reason: 'Der Wortlaut gibt ein Recht auf Einsicht. Einen Anspruch auf kostenlose Zusendung von Kopien nennt er nicht.',
      reply: '§ 18 Abs. 4 WEG gewährt Einsicht in die Verwaltungsunterlagen. Eine Pflicht zur kostenlosen Zusendung von Kopien nennt die Vorschrift nicht. Gern vereinbaren wir einen Einsichtstermin: [Terminvorschlag].'
    },
    {
      id: 'jahresabrechnung-aufstellen', topic: 'jahresabrechnung-pflicht', label: 'Aufstellung der Jahresabrechnung', area: 'weg',
      sentence: 'Der Verwalter ist verpflichtet, nach Ablauf des Kalenderjahres eine Jahresabrechnung aufzustellen.',
      rating: 'belegt', source: '§ 28 Abs. 2 WEG',
      reason: 'Nach Ablauf des Kalenderjahres hat der Verwalter eine Abrechnung über den Wirtschaftsplan (Jahresabrechnung) aufzustellen, die darüber hinaus die Einnahmen und Ausgaben enthält.',
      reply: 'Der Verwalter hat nach Ablauf des Kalenderjahres die Jahresabrechnung aufzustellen (§ 28 Abs. 2 WEG). Den Stand für [Objekt] teilen wir Ihnen mit: [Stand].'
    },
    {
      id: 'einladung-zwei-wochen', topic: 'einladung', label: 'Einberufungsfrist', area: 'weg',
      lock: either(URGENT, AGREEMENT),
      sentence: 'Die Einladung zur Versammlung ist mit einer Frist von zwei Wochen ausreichend.',
      rating: 'fraglich', source: '§ 24 Abs. 4 WEG',
      reason: 'Die Frist der Einberufung soll mindestens drei Wochen betragen, sofern nicht ein Fall besonderer Dringlichkeit vorliegt.',
      reply: 'Die Einberufungsfrist soll mindestens drei Wochen betragen, außer in Fällen besonderer Dringlichkeit (§ 24 Abs. 4 WEG).'
    },
    {
      id: 'jahresabrechnung-556', topic: 'jahresabrechnung', label: 'Frist für die Jahresabrechnung', area: 'weg',
      sentence: 'Die Jahresabrechnung der Eigentümergemeinschaft ist verfristet, denn nach § 556 BGB muss sie innerhalb von zwölf Monaten vorliegen.',
      rating: 'fraglich', source: '§ 556 Abs. 3 BGB; § 28 Abs. 2 WEG',
      reason: '§ 556 Abs. 3 BGB regelt die Betriebskostenabrechnung im Mietverhältnis. Für die Jahresabrechnung der Gemeinschaft gilt § 28 Abs. 2 WEG; er nennt keine Frist von zwölf Monaten.',
      reply: '§ 556 Abs. 3 BGB betrifft die Abrechnung zwischen Vermieter und Mieter. Für die Jahresabrechnung der Gemeinschaft gilt § 28 Abs. 2 WEG.'
    },
    {
      id: 'anfechtung-46', topic: 'anfechtung', label: 'Frist der Anfechtungsklage', area: 'weg', lock: OLD_LAW,
      sentence: 'Nach § 46 WEG kann ich den Beschluss darüber auch noch anfechten.',
      rating: 'fraglich', source: '§§ 44, 45 WEG',
      reason: 'Zitiert wird offenbar altes Recht. Die Beschlussklagen und ihre Fristen stehen heute in §§ 44 und 45 WEG.',
      reply: 'Die von Ihnen zitierte Vorschrift entspricht nicht der geltenden Fassung. Beschlussklagen und Fristen regeln heute §§ 44 und 45 WEG.'
    },

    /* ───── Wohnraummiete ───── */
    {
      id: 'belege-einsicht', topic: 'belege', label: 'Einsicht in die Abrechnungsbelege', area: 'miete',
      sentence: 'Als Mieter habe ich außerdem Anspruch auf Einsicht in die Belege zu der Abrechnung.',
      rating: 'belegt', source: '§ 556 Abs. 4 BGB',
      reason: 'Der Vermieter hat dem Mieter auf Verlangen Einsicht in die der Abrechnung zugrundeliegenden Belege zu gewähren. Er ist berechtigt, die Belege elektronisch bereitzustellen.',
      reply: 'Auf Verlangen erhalten Sie Einsicht in die Belege zur Abrechnung (§ 556 Abs. 4 BGB). Die Belege können auch elektronisch bereitgestellt werden. Vorschlag: [Termin oder Übermittlungsweg].'
    },
    {
      id: 'minderung-ohne-anzeige', topic: 'minderung', label: 'Mietminderung', area: 'miete',
      lock: DEFECT_KNOWN,
      sentence: 'Außerdem mindere ich die Miete rückwirkend für die letzten sechs Monate, auch ohne vorherige Anzeige.',
      rating: 'fraglich', source: '§ 536c BGB',
      reason: 'Mängel sind unverzüglich anzuzeigen. Soweit der Vermieter wegen der unterlassenen Anzeige nicht Abhilfe schaffen konnte, ist der Mieter nicht zur Minderung berechtigt. Die Anzeige ist also nicht in jedem Fall entbehrlich.',
      reply: 'Ein Mangel ist dem Vermieter unverzüglich anzuzeigen. Soweit wegen einer unterlassenen Anzeige keine Abhilfe möglich war, besteht kein Recht zur Minderung (§ 536c BGB). Bitte nennen Sie uns, wann Sie den Mangel gemeldet haben.'
    },
    {
      id: 'erhaltungspflicht', topic: 'erhaltung', label: 'Erhaltungspflicht des Vermieters', area: 'miete',
      sentence: 'Der Vermieter ist verpflichtet, die Wohnung in einem vertragsgemäßen Zustand zu erhalten.',
      rating: 'belegt', source: '§ 535 Abs. 1 BGB',
      reason: 'Der Vermieter hat die Mietsache in einem zum vertragsgemäßen Gebrauch geeigneten Zustand zu überlassen und sie während der Mietzeit in diesem Zustand zu erhalten.',
      reply: 'Der Vermieter hat die Mietsache während der Mietzeit in einem zum vertragsgemäßen Gebrauch geeigneten Zustand zu erhalten (§ 535 Abs. 1 BGB). Wir nehmen Ihre Meldung auf und prüfen sie. Vorschlag für eine Besichtigung: [Termin].'
    },
    {
      id: 'minderung-grundsatz', topic: 'minderung', label: 'Mietminderung', area: 'miete',
      sentence: 'Bei einem Mangel darf der Mieter die Miete mindern.',
      rating: 'belegt', source: '§ 536 Abs. 1 BGB; § 536 Abs. 1a BGB; § 536b BGB; § 536c BGB',
      reason: 'Mindert ein Mangel die Tauglichkeit, ist nur eine angemessen herabgesetzte Miete zu entrichten. Eine unerhebliche Minderung der Tauglichkeit bleibt außer Betracht. Einschränkungen: energetische Modernisierung für drei Monate (§ 536 Abs. 1a), Kenntnis des Mangels (§ 536b) und unterlassene Anzeige (§ 536c).',
      reply: 'Mindert ein Mangel die Tauglichkeit der Wohnung nicht nur unerheblich, ist für diese Zeit eine angemessen herabgesetzte Miete geschuldet (§ 536 Abs. 1 BGB); Ausnahmen regeln § 536 Abs. 1a, § 536b und § 536c BGB. Ob ein solcher Mangel vorliegt, prüfen wir. Vorschlag für eine Besichtigung: [Termin].'
    },
    {
      id: 'modernisierung-ankuendigung', topic: 'modernisierung-ankuendigung', label: 'Ankündigung der Modernisierung', area: 'miete',
      sentence: 'Eine Modernisierung muss mindestens drei Monate vor Beginn in Textform angekündigt werden.',
      rating: 'belegt', source: '§ 555c Abs. 1 BGB; § 555c Abs. 4 BGB',
      reason: 'Der Vermieter hat eine Modernisierungsmaßnahme spätestens drei Monate vor ihrem Beginn in Textform anzukündigen. Das gilt nicht für Maßnahmen, die nur mit einer unerheblichen Einwirkung auf die Mietsache verbunden sind und nur zu einer unerheblichen Mieterhöhung führen (§ 555c Abs. 4).',
      reply: 'Eine Modernisierungsmaßnahme ist spätestens drei Monate vor ihrem Beginn in Textform anzukündigen. Das gilt nicht, wenn sie nur mit einer unerheblichen Einwirkung auf die Mietsache verbunden ist und nur zu einer unerheblichen Mieterhöhung führt (§ 555c Abs. 1 und 4 BGB). Wir prüfen Datum und Inhalt der Ankündigung.'
    },
    {
      id: 'modernisierung-8-prozent', topic: 'modernisierung-hoehe', label: 'Höhe der Mieterhöhung nach Modernisierung', area: 'miete', lock: OLD_LAW,
      sentence: 'Nach einer Modernisierung darf die jährliche Miete um 8 Prozent der aufgewendeten Kosten erhöht werden.',
      rating: 'belegt', source: '§ 559 Abs. 1 BGB',
      reason: 'Der Satz von 8 Prozent der für die Wohnung aufgewendeten Kosten gilt bei Modernisierungsmaßnahmen nach § 555b Nummer 1, 3, 4, 5 oder 6 (§ 559 Abs. 1 Satz 1 BGB). Im Fall der Nummer 4a ist die Erhöhung nur zulässig, wenn der Mieter seinen Anbieter öffentlich zugänglicher Telekommunikationsdienste über den Anschluss frei wählen kann und der Vermieter kein Bereitstellungsentgelt nach § 72 TKG als Betriebskosten umlegt oder umgelegt hat (§ 559 Abs. 1 Satz 2 BGB). Für Nummer 1a gilt § 559e BGB: Erfüllt die Maßnahme dem Grunde nach die Fördervoraussetzungen und wurden Drittmittel genutzt, sind es 10 Prozent der aufgewendeten Kosten abzüglich dieser Drittmittel. Erfolgt keine Förderung, obwohl die Voraussetzungen dem Grunde nach erfüllt sind, ist eine Erhöhung nach Maßgabe des § 559 möglich. Erhaltungskosten sind abzuziehen; Kappungsgrenzen, Härtefälle und Sonderregeln (§ 559 Abs. 2 bis 5 BGB) sind zu beachten.',
      reply: 'Bei Modernisierungsmaßnahmen nach § 555b Nummer 1, 3, 4, 5 oder 6 BGB kann die jährliche Miete um 8 Prozent der für die Wohnung aufgewendeten Kosten erhöht werden (§ 559 Abs. 1 BGB). Erhaltungskosten sind abzuziehen, Kappungsgrenzen und Härtefälle zu beachten. Die Berechnung erläutern wir Ihnen.'
    },
    {
      id: 'modernisierung-11-prozent', topic: 'modernisierung-hoehe', label: 'Höhe der Mieterhöhung nach Modernisierung', area: 'miete', lock: OLD_LAW,
      sentence: 'Nach einer Modernisierung darf die Miete jährlich nur um 11 Prozent der Kosten erhöht werden.',
      rating: 'fraglich', source: '§ 559 Abs. 1 BGB',
      reason: 'Der Satz in § 559 Abs. 1 BGB beträgt 8 Prozent der für die Wohnung aufgewendeten Kosten, nicht 11 Prozent.',
      reply: 'Der gesetzliche Satz nach § 559 Abs. 1 BGB beträgt 8 Prozent der für die Wohnung aufgewendeten Kosten pro Jahr, nicht 11 Prozent.'
    },
    {
      id: 'modernisierung-zustimmung', topic: 'modernisierung-zustimmung', label: 'Zustimmung zur Modernisierung', area: 'miete', lock: /h(?:ä|ae)rte|vereinbar/i,
      sentence: 'Ohne meine Zustimmung ist die Modernisierung nicht zulässig.',
      rating: 'fraglich', source: '§ 555d Abs. 1 BGB; § 555d Abs. 2 BGB',
      reason: 'Der Mieter hat eine Modernisierungsmaßnahme zu dulden. Eine Zustimmung setzt das Gesetz dafür nicht voraus; die Duldungspflicht entfällt aber bei einer nicht zu rechtfertigenden Härte.',
      reply: 'Modernisierungsmaßnahmen sind grundsätzlich zu dulden (§ 555d Abs. 1 BGB); eine Ausnahme gilt bei einer nicht zu rechtfertigenden Härte (§ 555d Abs. 2 BGB).'
    },
    {
      id: 'abrechnung-sechs-monate', topic: 'betriebskostenfrist', label: 'Abrechnungsfrist der Betriebskosten', area: 'miete', lock: AGREEMENT,
      sentence: 'Nach dem Gesetz muss die Nebenkostenabrechnung innerhalb von sechs Monaten erstellt werden, sonst ist sie verfristet.',
      rating: 'fraglich', source: '§ 556 Abs. 3 BGB',
      reason: 'Die gesetzliche Abrechnungsfrist endet mit Ablauf des zwölften Monats nach Ende des Abrechnungszeitraums, nicht nach sechs Monaten.',
      reply: 'Die gesetzliche Frist für die Betriebskostenabrechnung endet mit Ablauf des zwölften Monats nach Ende des Abrechnungszeitraums (§ 556 Abs. 3 BGB).'
    },
    {
      id: 'einwendungen-jederzeit', topic: 'einwendungen', label: 'Frist für Einwendungen gegen die Abrechnung', area: 'miete',
      sentence: 'Einwendungen gegen die Abrechnung kann ich jederzeit und ohne Frist erheben.',
      rating: 'fraglich', source: '§ 556 Abs. 3 BGB',
      reason: 'Einwendungen sind spätestens bis zum Ablauf des zwölften Monats nach Zugang der Abrechnung mitzuteilen. Danach sind sie ausgeschlossen, es sei denn, der Mieter hat die Verspätung nicht zu vertreten.',
      reply: 'Für Einwendungen gilt eine Frist: Sie sind bis zum Ablauf des zwölften Monats nach Zugang der Abrechnung mitzuteilen, es sei denn, der Mieter hat die Verspätung nicht zu vertreten (§ 556 Abs. 3 BGB).'
    }
  ];

  /* ───── Themen-Erkennung: immer "unklar". Der erste Treffer zählt, darum steht Heizung vorn. ───── */
  const HEATING = /heiz|w(?:ä|ae)rme|warmwasser|brennstoff|fernw(?:ä|ae)rme|(?<![a-zäöüß])(?:erd|heiz)?gas(?![ts])/i;
  const HEATING_SOURCE = 'HeizkostenV, §§ 3, 7';

  const topic = (id, label, source, ...when) => ({ id, label, source, when });
  const TOPICS = [
    topic('heizkosten', 'Heiz- und Warmwasserkosten', HEATING_SOURCE, HEATING, /kosten|verbrauch|verteil|umge?leg|abrechn|wohnfl|anteil|zahl|tragen/i),
    topic('sonderumlage', 'Sonderumlage', '§ 28 WEG', /sonderumlage/i),
    topic('hausgeld', 'Zahlung des Hausgelds', '§ 28 WEG', /hausgeld|wohngeld/i),
    topic('anfechtung', 'Anfechtung eines Beschlusses', '§ 45 WEG', /an(?:zu)?fecht|angefochten|§ ?4[456]\b[^.]{0,10}WEG/i),
    topic('nichtig', 'Gültigkeit eines Beschlusses', '§ 23 Abs. 4 WEG', /beschlu|beschl(?:ü|ue)ss/i, /nichtig|unwirksam|ung(?:ü|ue)ltig|widerspr|einspruch|dagegen gestimmt/i),
    topic('einsicht', 'Einsicht in Unterlagen', '§ 18 Abs. 4 WEG', /verwaltungsunterlagen|§ ?18 Abs\.? ?4/i),
    topic('belege', 'Einsicht in die Abrechnungsbelege', '§ 556 Abs. 4 BGB', /beleg/i, /einsicht|einsehen|kopie|zusend|zuschick/i),
    topic('unterlagen', 'Einsicht in Unterlagen', '§ 18 Abs. 4 WEG', /unterlagen/i, /einsicht|einsehen|kopie|zusend|zuschick/i),
    topic('einladung', 'Einberufung der Versammlung', '§ 24 Abs. 4 WEG', /einberuf|einladung/i, /woche|\btage?n?\b|monat|frist|sp(?:ä|ae)t|dringlich/i),
    topic('vermoegensbericht', 'Vermögensbericht', '§ 28 Abs. 4 WEG', /verm(?:ö|oe)gensbericht/i),
    topic('jahresabrechnung', 'Jahresabrechnung', '§ 28 Abs. 2 WEG', /jahresabrechnung|hausgeldabrechnung|nachsch(?:uss|üsse)|abrechnungsspitze|wirtschaftsplan/i),
    topic('abberufung', 'Abberufung des Verwalters', '§ 26 Abs. 3 WEG', /verwalter/i, /abberuf|abgew(?:ä|ae)hlt/i),
    topic('notmassnahme', 'Eigene Notmaßnahme', '§ 18 Abs. 3 WEG', /notma(?:ß|ss)nahme|unmittelbar drohende|§ ?18 Abs\.? ?3/i),
    topic('bau-kosten', 'Kosten einer baulichen Veränderung', '§ 21 WEG', /wallbox|lades(?:ä|ae)ule|ladestation|balkonkraftwerk|steckersolar|treppenlift|bauliche/i, /kosten|bezahl|zahlen/i),
    topic('bauliche-veraenderung', 'Bauliche Veränderung', '§ 20 WEG', /wallbox|lades(?:ä|ae)ule|ladestation|ladepunkt|balkonkraftwerk|steckersolar|treppenlift|rollstuhl|einbruchs?schutz|glasfaser|klimaanlage|markise|wintergarten|pergola|satellitensch|bauliche|§ ?2[02]\b[^.]{0,10}WEG/i),
    topic('minderung', 'Mietminderung', '§§ 536, 536c BGB', /mietminder|miete[^.]{0,60}(?:minder|k(?:ü|ue)rz|einbehalt)|(?:minder|mindere|k(?:ü|ue)rze)[^.]{0,60}miete/i),
    topic('sonderkuendigung', 'Sonderkündigungsrecht', '§ 561 BGB', /sonderk(?:ü|ue)ndig|au(?:ß|ss)erordentlich[^.]{0,30}k(?:ü|ue)ndig/i),
    topic('modernisierung-ankuendigung', 'Ankündigung der Modernisierung', '§ 555c BGB', /modernisier/i, /an(?:ge|zu)?k(?:ü|ue)ndig/i),
    topic('modernisierung-hoehe', 'Mieterhöhung nach Modernisierung', '§ 559 BGB', /modernisier|umlage|miete|mieterh/i, /prozent|%|euro|€|erh(?:ö|oe)h/i, /modernisier|umlage|prozent|%/i),
    topic('modernisierung', 'Modernisierung', '§ 555d BGB', /modernisier/i),
    topic('einwendungen', 'Einwendungen gegen die Abrechnung', '§ 556 Abs. 3 BGB', /einwend/i),
    topic('betriebskosten', 'Betriebskostenabrechnung', '§ 556 BGB', /(?:betriebs|neben)kosten|abrechnungszeitraum|nachforderung|§ ?556/i),
    topic('kosten', 'Verteilung der Kosten', '§ 16 Abs. 2 WEG', /kostenverteil|verteilungsschl|umlageschl|miteigentumsanteil|(?:kosten)[^.]{0,80}(?:verteil|anteil|wohnfl|beteilig)|(?:verteil|beteilig)[^.]{0,80}kosten/i),
    topic('instandhaltung', 'Erhaltung der Wohnung', '§ 535 Abs. 1 BGB', /vermieter|mieter/i, /zustand|instand|reparatur|mangel|m(?:ä|ae)ngel/i),
    topic('verwaltung', 'Ordnungsmäßige Verwaltung', '§ 18 Abs. 2 WEG', /ordnungs(?:m(?:ä|ae)(?:ß|ss)ig|gem(?:ä|ae)(?:ß|ss))[^.]{0,20}verwaltung/i)
  ];

  // Zitierte Urteile: nie bewerten, immer prüfen lassen (typisch: erfundene Aktenzeichen).
  const CASE_LAW = /\b(?:BGH|BVerfG|OLG|LG|AG)\b[^.!?]{0,80}(?:Urt(?:eil|\.)|Beschluss vom|Az\.|Aktenzeichen|\d{1,4}\/\d{2,4})|\b(?:V|VIII|XII) ?ZR ?\d{1,4}\/\d{2}|\bUrteil(?:e)? des (?:BGH|Bundesgerichtshofs?|Landgerichts?|Amtsgerichts?|Oberlandesgerichts?)/;
  // Sätze mit Rechtsbezug ohne erkanntes Thema: als "unklar" listen statt verschweigen.
  const LEGAL_SIGNAL = /§|\b(?:WEG|BGB|BetrKV|HeizkostenV|HeizKV)\b|gesetzlich|laut gesetz|nach dem gesetz|rechtswidrig|rechtlich|unzul(?:ä|ae)ssig|unwirksam|ung(?:ü|ue)ltig|\bnichtig|anspruch|berechtigt|verpflichtet|rechtsanspruch|\b(?:mein|das|ein|unser) recht\b|recht auf|haft(?:et|en|bar|ung)|schadens?ersatz|verj(?:ä|ae)hr|verfristet|frist ?(?:von|abgelaufen)|rechtsprechung|ausgeschlossen|(?:ohne|keine[nm]?) (?:einen )?(?:beschluss|zustimmung|genehmigung)|nachzahlung|\bf(?:ä|ae)llig|(?:innerhalb|binnen|fr(?:ü|ue)hestens|sp(?:ä|ae)testens|h(?:ö|oe)chstens)[^.]{0,30}(?:tage?n?\b|wochen?\b|monat|jahr)|einsicht|\bverlangen\b|instand ?(?:zu )?(?:halten|setzen)/i;

  /* ───── Kontextsperren für Katalogtreffer: im Zweifel "unklar" ───── */
  const word = (alternatives) => new RegExp('(?<![\\p{L}])(?:' + alternatives + ')(?![\\p{L}])', 'iu');
  // Widerspruch oder Einschränkung in einem anderen Satz des Briefs.
  const CONTRADICTION = word([
    'allerdings', 'jedoch', 'aber', 'doch', 'indes(?:sen)?', 'hingegen', 'dagegen', 'dennoch', 'trotzdem', 'gleichwohl',
    '(?:ist|sei|w(?:ä|ae)re|war) (?:(?:so|aber|schlicht|nat(?:ü|ue)rlich) )*(?:falsch|unrichtig|unzutreffend|unwahr)',
    'falsch(?:e[nrs]?)?', 'unrichtig\\p{L}*', 'unzutreffend\\p{L}*', 'irrtum', 'irrt', 'irren', 'unsinn', 'quatsch', 'gegenteil',
    '(?:stimmt|gilt|trifft)(?: \\p{L}+){0,3} (?:nicht|nie|keineswegs|keinesfalls)', 'nicht (?:zu|richtig|korrekt|wahr|mehr)', 'keineswegs', 'keinesfalls',
    'abgeschafft', 'gestrichen', 'weggefallen', 'entf(?:ä|ae)llt', 'entfallen', 'hinf(?:ä|ae)llig', 'gekippt', 'gegenstandslos', 'verl(?:ä|ae)ngert', 'verk(?:ü|ue)rzt',
    'm(?:ä|ae)rchen', 'fehler\\p{L}*', 'bezweif\\p{L}*', 'zweifel\\p{L}*', 'widerspreche\\p{L}*', 'in (?:wahrheit|wirklichkeit)', 'tats(?:ä|ae)chlich', 'leider nicht', 'nichts davon', '(?:ü|ue)berholt', 'veraltet', 'au(?:ß|ss)er kraft', 'ge(?:ä|ae)ndert', 'reform\\p{L}*', 'fr(?:ü|ue)her', 'einst', 'bis \\d{4}',
    'erst (?:wenn|dann|nach|ab|mit zustimmung)', 'nur (?:wenn|dann|soweit|sofern|falls|bei|mit|nach|f(?:ü|ue)r|unter|noch|auf)', 'gilt (?:das |dies )?(?:nur|erst)',
    'ausschlie(?:ß|ss)lich', 'sofern', 'soweit', 'falls', 'vorausgesetzt', 'es sei denn', 'unter der (?:bedingung|voraussetzung)',
    'au(?:ß|ss)er', 'ausgenommen', 'ausnahme\\p{L}*', 'einschr(?:ä|ae)nk\\p{L}*', 'anders', 'nein', 'bestreite\\p{L}*', 'behaupt\\p{L}*', 'angeblich', 'ger(?:ü|ue)cht',
    'voraussetz\\p{L}*', 'zuvor', 'vorher', 'unfug', 'gelogen', 'unwahr', 'weit gefehlt', 'mitnichten'
  ].join('|'));
  // Ein freier Satz (nicht im Katalog), der verneint und dabei auf etwas verweist ("Ein solches Recht gibt es nicht").
  const NEGATION = word('nicht|nichts|nie|niemals|kein\\p{L}*|weder');
  const REFERENCE = word('das|dies\\p{L}*|solch\\p{L}*|so|davon|dabei|regel\\p{L}*|vorschrift|ansicht|auffassung|darstellung|aussage|satz|fall');
  // Der unmittelbar folgende Satz greift die Aussage auf.
  const BACK_REFERENCE = /^["'„“”‚‘»« ()\-–—•*]*(?:das|dies(?:e[rsmn]?)?|dem|davon|so|nein|stimmt|nicht|und das|diese)(?![\p{L}])/iu;
  const AREA_FOREIGN = {
    // Mietrecht oder Gewerbe im Brief sperrt Einträge zum Wohnungseigentum.
    weg: /(?<!mit)miet(?!eigentum)|gewerbe|gewerblich|p(?:a|ä|ae)cht/i,
    // Wohnungseigentum oder Gewerbe sperrt Einträge zur Wohnraummiete.
    miete: /\bWEG\b|eigent(?:ü|ue)m|hausgeld|wohngeld|teilungserkl|gemeinschaftsordnung|verwalter|beirat|sonderumlage|jahresabrechnung|gewerbe|gewerblich|gesch(?:ä|ae)ftsr(?:ä|ae)um|ladenlokal|b(?:ü|ue)ro|praxis|lagerraum|stellplatz|garage|p(?:a|ä|ae)cht|gesch(?:ä|ae)ft|kanzlei|werkstatt|firma|gmbh/i
  };

  return Object.freeze({
    version: '2026-11-28', CATALOG: Object.freeze(CATALOG.map(Object.freeze)), TOPICS: Object.freeze(TOPICS),
    HEATING, HEATING_SOURCE, CASE_LAW, LEGAL_SIGNAL, CONTRADICTION, NEGATION, REFERENCE, BACK_REFERENCE, AREA_FOREIGN
  });
}));
