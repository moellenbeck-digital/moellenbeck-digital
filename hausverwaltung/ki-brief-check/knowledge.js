/* KI-Brief-Check: kuratierte Wissensbasis (Prototyp).
 *
 * NICHT JURISTISCH GEPRÜFT. Vor einem Livegang prüft eine Juristin oder ein Jurist jede Regel.
 * Paragrafen abgeglichen mit dem Wortlaut auf gesetze-im-internet.de (WEG, BGB), Abruf 28.11.2026.
 * Rechtsprechung ist bewusst nicht Teil der Wissensbasis.
 *
 * Bedeutung der Einschätzung (sie bewertet die behauptete Regel, nicht den Einzelfall):
 *   belegt   – der Wortlaut der Quelle trägt die behauptete Regel.
 *   fraglich – der Wortlaut der Quelle sagt etwas anderes oder gibt die Behauptung nicht her.
 *   unklar   – Einzelfall, Auslegung oder keine passende Regel. Im Zweifel immer "unklar".
 *
 * Eine Regel:
 *   id       eindeutiger Name
 *   topic    Regeln mit gleichem topic dürfen sich nicht widersprechen (sonst "unklar")
 *   label    Thema im Antwortentwurf
 *   when     alle Muster müssen im Satz vorkommen (bei "belegt" nur: Regel ist einschlägig)
 *   forms    nur "belegt": eng definierte Satzformen. Ohne Treffer gilt "unklar". Zusätzlich prüft der zentrale
 *            Sperrfilter in analyzer.js (Verneinung, Quantor, Zeitbezug, Bedingung, Rolle, Zahl).
 *   foreign  nur "belegt": Rollen, deren Nennung die Bestätigung ausschließt
 *   numbers  nur "belegt": die einzigen Zahlen, die im Satz stehen dürfen
 *   allow    nur "belegt": Wortlaut der Regel, den der Sperrfilter ausnimmt
 *   slots, wrong  Zahlen-Stellen der Formen und Urteil "fraglich" bei abweichender Zahl
 *   unless   keines dieser Muster darf im Satz vorkommen
 *   negation true = die Verneinung gehört zur Behauptung. Sonst stuft eine Verneinung auf "unklar".
 *   deny     Muster für das Gegenteil der Behauptung ("darf ich nicht"). Trifft es, gilt "unklar".
 *   rating, reason, source, reply
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KiBriefKnowledge = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Zahlwörter und Ziffern, jeweils vor einer Einheit.
  const N = {
    1: '(?:1|ein(?:es|em|en|er|e)?)', 2: '(?:2|zwei)', 3: '(?:3|drei)', 6: '(?:6|sechs)',
    8: '(?:8|acht)', 12: '(?:12|zw(?:ö|oe)lf)'
  };
  const MONTH = 'monat(?:s|e|en)?(?![a-zäöüß])';
  const months = (n) => new RegExp('(?<![\\d,.])\\b' + N[n] + '[ -]?' + MONTH, 'i');
  const OTHER_APPEAL_PERIOD = /(?<![\d,.])\b(?:(?:2|zwei|3|drei|4|vier|6|sechs)[ -]?(?:wochen?|monat(?:s|e|en)?)|(?:\d{2,}|vierzehn)[ -]?(?:tage?n?|wochen?))(?![a-zäöüß])/i;

  // "braucht keine Einstimmigkeit" ist das Gegenteil der Behauptung.
  const UNANIMITY_DENIAL = /(?:nicht|kein\w*) (?:(?:die|der|eine[rn]?) )?(?:einstimm|zustimmung aller)|einstimm\w*[^.,]{0,30}nicht (?:erforderlich|n(?:ö|oe)tig|notwendig)|ohne (?:die )?(?:zustimmung aller|einstimm\w*)[^.]{0,60}\b(?<!nicht )(?:wirksam|g(?:ü|ue)ltig|m(?:ö|oe)glich|zul(?:ä|ae)ssig)\b|ohne (?:die )?(?:zustimmung aller|einstimm\w*)[^.]{0,60}\b(?<!nicht )(?:ge(?:ä|ae)ndert|beschlossen) werden/i;
  const OLD_LAW_AWARE = /a\.? ?F\.|alte[rn]? (?:fassung|recht)|fr(?:ü|ue)her|bisher/i;
  const WEG_ACCOUNT = /jahresabrechnung|hausgeldabrechnung/i;
  const TENANT = /\bmiete|\bmieter|vermieter|betriebskosten|nebenkosten|mietverh/i;
  const UTILITY = /(?:betriebs|neben|heiz)kosten(?:ab|nach)?(?:rechnung|forderung|zahlung)?/i;
  const MODERNIZATION = /modernisier/i;
  const RENT_INCREASE = /mieterh(?:ö|oe)h|miete[^.]{0,40}erh(?:ö|oe)h|erh(?:ö|oe)h[^.]{0,40}miete|umlage|umlegen|umgelegt/i;
  const EV = /wallbox|lades(?:ä|ae)ule|ladestation|lademöglichkeit|lade(?:punkt|einrichtung|infrastruktur)|elektroauto|e-auto/i;
  const SOLAR = /balkonkraftwerk|steckersolar|stecker-solar/i;
  const PRIVILEGED = new RegExp(EV.source + '|' + SOLAR.source + '|einbruchs?schutz|barriere|treppenlift|rollstuhl|glasfaser', 'i');
  const ENTITLED = /anspruch|\brecht\b|verlangen|beanspruchen|zusteht|steht mir[^.]{0,20}zu/i;
  const WITHOUT_RESOLUTION = /ohne (?:einen |jeden )?(?:beschluss|zustimmung|genehmigung|erlaubnis|abstimmung)|(?:kein(?:en)?|nicht)[^.]{0,30}(?:beschluss|zustimmung|genehmigung)[^.]{0,30}(?:erforderlich|nötig|notwendig|brauch|benötig)|(?:brauche|benötige|bedarf)[^.]{0,30}(?:keine[ns]?)[^.]{0,20}(?:beschluss|zustimmung|genehmigung)|eigenmächtig/i;

  /* ───── Bausteine der eng definierten "belegt"-Formen ─────
   * Eine Form passt nur auf den GANZEN Satz. Jede Abweichung (anderes Subjekt, Zusatz, anderes Verb) ergibt "unklar".
   * Benannte Gruppen sind Zahlen-Stellen: weicht die Zahl von "slots" ab, gilt "fraglich" mit Hinweis ("wrong"). */
  const u = (s) => s.replace(/ä/g, '(?:ä|ae)').replace(/ö/g, '(?:ö|oe)').replace(/ü/g, '(?:ü|ue)').replace(/ß/g, '(?:ß|ss)');
  const form = (...parts) => new RegExp(u('^(?:[-•*] )?' + parts.join('') + ' ?[.!]?$'), 'i');
  const NUM = '(?:\\d{1,3}|ein(?:es|em|en|er|e)?|zwei(?:er)?|drei(?:er)?|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|vierzehn)';
  const MONTHS = 'Monat(?:s|e|en)?';
  const within = (name) => '(?:innerhalb|binnen)(?: von)? (?<' + name + '>' + NUM + ') ' + MONTHS;
  const OWNER = '(?:Wohnungs)?eigentümer(?:in)?';
  // "ich" nur mit ausdrücklicher Rolle: sonst ist offen, wer das Recht beansprucht.
  const OWNER_HAS = '(?:Als ' + OWNER + ' habe ich|Ich habe als ' + OWNER + '|Jeder Wohnungseigentümer hat)';
  const OWNER_CAN = '(?:Als ' + OWNER + ' (?:kann|darf) ich|Ich (?:kann|darf) als ' + OWNER + '|Jeder Wohnungseigentümer (?:kann|darf))';
  const RECORDS = 'Verwaltungsunterlagen(?: der (?:Gemeinschaft|Wohnungseigentümergemeinschaft))?';
  const SUIT = '(?:Die Anfechtungsklage|Die Klage zur Anfechtung des Beschlusses)(?: gegen (?:den|einen) Beschluss)?';
  const AFTER_VOTE = '(?: nach (?:der )?Beschlussfassung)?';
  const AFTER_YEAR = '(?:nach Ablauf (?:des|eines) Kalenderjahres )?';
  const NOTICE = 'Die (?:Einberufungs|Einladungs)frist(?: zur (?:Eigentümer)?versammlung)?';
  const DEVICE = '(?:einer Wallbox|einer Ladestation|einer Lademöglichkeit|eines Ladepunkts|eines Balkonkraftwerks|eines Steckersolargeräts|eines Treppenlifts)';
  const PARKING = '(?: an meinem (?:Tiefgaragenstellplatz|Stellplatz))?';
  const UTILITY_BILL = 'Die (?:Betriebs|Neben)kostenabrechnung';
  const PERIOD_END = ' nach (?:dem )?Ende des Abrechnungszeitraums';
  const DELIVERED = ' (?:zugehen|zugegangen sein|mitgeteilt werden|mitzuteilen)';
  const OBJECTION = 'Einwendungen(?: gegen die (?:Betriebskosten|Nebenkosten)?abrechnung)?';
  const AFTER_ACCESS = ' nach (?:dem )?Zugang(?: der Abrechnung)?';
  const RECEIPTS = 'die (?:Abrechnungsbelege|Belege(?: (?:zu der|zur) (?:Betriebskosten|Nebenkosten)?abrechnung)?)';
  const IF_AGREED = 'wenn (?:dies|das) (?:im Mietvertrag )?vereinbart (?:ist|wurde)';
  const FIT_STATE = '(?:zum vertragsgemäßen Gebrauch geeigneten|vertragsgemäßen|gebrauchsfähigen)';
  // Rollen, deren Nennung eine Bestätigung ausschließt (falscher Berechtigter oder Verpflichteter).
  const OWNER_FOREIGN = ['mieter', 'vermieter', 'verwalter', 'beirat', 'nachbar'];
  const TENANCY_FOREIGN = ['eigentuemer', 'verwalter', 'gemeinschaft', 'beirat', 'nachbar'];
  // Heiz- und Warmwasserkosten: hier gilt zusätzlich die HeizkostenV, die nicht in der Wissensbasis steht.
  const HEATING = /heiz(?:ungs?)?[ -]?(?:und warmwasser)?kosten|heiz- und warmwasser|warmwasser|heizkostenv|heizung[^.]{0,60}(?:kosten|verbrauch|verteil)|(?:kosten|verbrauch)[^.]{0,60}heizung/i;
  // § 21 Abs. 2 WEG: qualifizierte Mehrheit oder Amortisation.
  const MAJORITY = /mehrheit|zwei ?drittel|2\/3|§ ?21 Abs\.? ?2|amortis|beschlossen/i;

  const RULES = [
    /* ───── WEG: Hausgeld und Kosten ───── */
    {
      id: 'hausgeld-zurueckhalten', topic: 'hausgeld-zahlung', label: 'Zahlung des Hausgelds', negation: true,
      when: [/hausgeld|wohngeld|(?:hausgeld)?vorsch(?:uss|üsse)/i, /zur(?:ü|ue)ck(?:zu)?(?:be)?halt|halte[^.]{0,80}zur(?:ü|ue)ck|einbehalt|behalte[^.]{0,80}ein\b|k(?:ü|ue)rz|verweiger|aussetz|setze[^.]{0,80}aus\b|nicht (?:mehr )?(?:zahlen|bezahlen|überweisen|leisten)|stelle[^.]{0,80}ein\b|aufrechn|verrechne/i, /\bich\b|\bwir\b|\bmir\b|darf|kann|berechtigt|\brecht\b/i],
      deny: /(?:nicht|nie|kein\w*)[^.,]{0,25}(?:zur(?:ü|ue)ck(?:zu)?(?:be)?halt|einbehalt|k(?:ü|ue)rz|verweiger|aufrechn|ausgesetzt)|(?:zur(?:ü|ue)ck(?:zu)?(?:be)?halt\w*|k(?:ü|ue)rz\w*|aufrechn\w*)[^.,]{0,30}(?:nicht (?:zul(?:ä|ae)ssig|erlaubt|m(?:ö|oe)glich)|ausgeschlossen|unzul(?:ä|ae)ssig)|(?:darf|kann|werde)[^.,]{0,40}(?:nicht|nie) (?:zur(?:ü|ue)ck|k(?:ü|ue)rz|einbehalt)/i,
      rating: 'fraglich', source: '§ 28 Abs. 1 WEG; § 16 Abs. 2 WEG',
      reason: 'Die Vorschüsse beruhen auf einem Beschluss der Wohnungseigentümer. Ein Recht, sie einseitig zurückzuhalten oder zu kürzen, ergibt sich aus diesen Vorschriften nicht.',
      reply: 'Die Vorschüsse zum Hausgeld haben die Wohnungseigentümer beschlossen (§ 28 Abs. 1 WEG). Ein Recht, die Zahlung einseitig zurückzuhalten oder zu kürzen, ergibt sich daraus nach unserem Verständnis nicht. Wir bitten Sie, die Zahlungen fristgerecht fortzuführen. Ihre Einwände prüfen wir gesondert.'
    },
    {
      id: 'kosten-mea', topic: 'kostenverteilung', label: 'Verteilung der Kosten',
      when: [/kosten|hausgeld/i, /anteil/i, /verteil|getragen|tragen|umgelegt|bemisst|richtet/i],
      forms: [form('(?:Die )?Kosten(?: der Gemeinschaft(?: der Wohnungseigentümer)?)? werden (?:grundsätzlich )?nach (?:dem Verhältnis der Miteigentumsanteile|(?:den )?Miteigentumsanteilen) (?:verteilt|getragen|umgelegt)')],
      foreign: ['mieter', 'vermieter', 'beirat', 'nachbar'], numbers: [],
      allow: [/nach (?:dem Verhältnis der |(?:den )?)Miteigentumsanteilen?/],
      rating: 'belegt', source: '§ 16 Abs. 2 WEG',
      reason: 'Gesetzlicher Grundsatz ist die Verteilung nach dem Verhältnis der Anteile. Vereinbarungen oder Beschlüsse können davon abweichen.',
      reply: 'Nach § 16 Abs. 2 WEG werden die Kosten grundsätzlich nach dem Verhältnis der Miteigentumsanteile verteilt. Wir prüfen, ob für die betroffene Kostenart eine abweichende Vereinbarung oder ein Beschluss gilt.'
    },
    {
      id: 'kosten-wohnflaeche', topic: 'kostenverteilung', label: 'Verteilung der Kosten', negation: true,
      when: [/hausgeld|kosten/i, /wohnfl(?:ä|ae)che/i, /immer|zwingend|gesetzlich|nach dem gesetz|laut gesetz|§ ?16|ausschlie(?:ß|ss)lich|nur nach|\bm(?:u|ü)ss(?:en)?\b/i],
      unless: [TENANT, HEATING],
      deny: /nicht (?:immer|zwingend|nur|ausschlie(?:ß|ss)lich|nach (?:der )?wohnfl|gesetzlich)|kein\w*[^.,]{0,20}(?:pflicht|zwang)/i,
      rating: 'fraglich', source: '§ 16 Abs. 2 WEG',
      reason: 'Das Gesetz nennt als Grundsatz die Miteigentumsanteile, nicht die Wohnfläche. Ein anderer Maßstab braucht eine Vereinbarung oder einen Beschluss.',
      reply: 'Gesetzlicher Maßstab für die Kosten der Gemeinschaft sind die Miteigentumsanteile (§ 16 Abs. 2 WEG), nicht die Wohnfläche. Ein anderer Maßstab gilt nur, wenn eine Vereinbarung oder ein Beschluss ihn vorsieht. Das prüfen wir für Ihr Objekt.'
    },
    {
      id: 'kosten-keine-nutzung', topic: 'kosten-nutzung', label: 'Kosten bei fehlender Nutzung', negation: true,
      when: [/aufzug|fahrstuhl|\blift\b|tiefgarage|schwimmbad|sauna|spielplatz|garten|waschk(?:ü|ue)che|gemeinschaft/i, /(?:nicht|nie|niemals) (?:be)?nutz|nutze[^.]{0,60}(?:nicht|nie)\b|wohne im erdgeschoss/i, /(?:nicht|nichts)(?: mehr| auch)? (?:zu )?(?:be)?(?:zahlen|zahle|beteiligen|tragen)|keine (?:\S+ )?kosten|(?:zahle|beteilige|trage)[^.,]{0,50}\bnicht(?:s)?\b|nicht an[^.,]{0,30}kosten|von (?:den )?[^.,]{0,20}kosten befreit/i],
      unless: [TENANT, HEATING],
      deny: /auch wer|auch wenn|trotzdem|dennoch|gleichwohl|nicht (?:von[^.,]{0,30})?befreit/i,
      rating: 'fraglich', source: '§ 16 Abs. 2 WEG',
      reason: 'Die Kostenpflicht hängt nach dem gesetzlichen Grundsatz nicht von der persönlichen Nutzung ab. Eine Ausnahme braucht eine Vereinbarung oder einen Beschluss.',
      reply: 'Die Pflicht, Kosten des gemeinschaftlichen Eigentums mitzutragen, hängt nach § 16 Abs. 2 WEG grundsätzlich nicht von der persönlichen Nutzung ab. Wir prüfen, ob eine abweichende Vereinbarung oder ein Beschluss besteht.'
    },
    {
      id: 'verteilung-nur-einstimmig', topic: 'kostenverteilung-aenderung', label: 'Änderung der Kostenverteilung', negation: true,
      when: [/kostenverteil|verteilungsschl(?:ü|ue)ssel|umlageschl(?:ü|ue)ssel|verteilerschl(?:ü|ue)ssel/i, /nur[^.]{0,40}(?:einstimmig|allstimmig|zustimmung aller|alle[nr]? )|einstimmig|zustimmung aller|nicht[^.]{0,40}(?:durch )?(?:mehrheits)?beschluss/i],
      unless: [TENANT, HEATING],
      deny: UNANIMITY_DENIAL,
      rating: 'fraglich', source: '§ 16 Abs. 2 Satz 2 WEG',
      reason: 'Die Wohnungseigentümer können für einzelne Kosten oder Kostenarten eine abweichende Verteilung beschließen. Einstimmigkeit verlangt die Vorschrift nicht.',
      reply: 'Für einzelne Kosten oder Kostenarten können die Wohnungseigentümer eine abweichende Verteilung beschließen (§ 16 Abs. 2 Satz 2 WEG). Einstimmigkeit verlangt die Vorschrift nicht. Ob Ihr Gemeinschaftsvertrag etwas Besonderes regelt, prüfen wir.'
    },

    {
      id: 'heizkosten', topic: 'heizkosten', label: 'Heiz- und Warmwasserkosten', negation: true,
      when: [HEATING, /verteil|umgelegt|umlegen|wohnfl|miteigentumsanteil|verbrauch|(?:be)?zahl|tragen|getragen/i],
      rating: 'unklar', source: 'keine Quelle in der Wissensbasis',
      reason: 'Für Heiz- und Warmwasserkosten gilt auch im Wohnungseigentum die Heizkostenverordnung. Sie ist nicht Teil dieser Wissensbasis. Bitte manuell prüfen.',
      reply: 'Die Verteilung der Heiz- und Warmwasserkosten prüfen wir gesondert, auch anhand der Heizkostenverordnung, und kommen darauf zurück.'
    },

    /* ───── WEG: Sonderumlage und Beschlüsse ───── */
    {
      id: 'sonderumlage-alle', topic: 'sonderumlage', label: 'Sonderumlage', negation: true,
      when: [/sonderumlage/i, /zustimmung (?:aller|s(?:ä|ae)mtlicher|jedes)|einstimmig|alle(?:r|n)? (?:wohnungs)?eigent(?:ü|ue)mer(?:innen)? (?:zustimm|einverstanden)|meine(?:r)? (?:persönliche[n]? )?zustimmung/i],
      deny: UNANIMITY_DENIAL,
      rating: 'fraglich', source: '§ 28 Abs. 1 WEG; § 25 Abs. 1 WEG',
      reason: 'Über Vorschüsse beschließen die Wohnungseigentümer. Bei der Beschlussfassung entscheidet die Mehrheit der abgegebenen Stimmen.',
      reply: 'Über Vorschüsse, zu denen auch eine Sonderumlage zählt, beschließen die Wohnungseigentümer (§ 28 Abs. 1 WEG). Es entscheidet die Mehrheit der abgegebenen Stimmen (§ 25 Abs. 1 WEG). Die Zustimmung aller ist danach nicht erforderlich, soweit Ihre Gemeinschaftsordnung nichts anderes regelt.'
    },
    {
      id: 'sonderumlage-dagegen', topic: 'sonderumlage-bindung', label: 'Bindung an den Beschluss zur Sonderumlage', negation: true,
      when: [/sonderumlage/i, /dagegen gestimmt|nicht zugestimmt|gegen[^.]{0,40}gestimmt|nicht (?:an der (?:versammlung|abstimmung) )?teilgenommen|nicht anwesend/i, /(?:nicht|nichts|keine)[^.]{0,40}(?:zahlen|bezahlen|leisten|schulde|verpflichtet|bindend|bindet)|(?:zahle|schulde|leiste)[^.]{0,40}(?:nicht|nichts)\b/i],
      deny: /auch wer|auch wenn|trotzdem|dennoch|gleichwohl|befreit (?:mich )?nicht|nicht (?:von[^.,]{0,30})?befreit/i,
      rating: 'fraglich', source: '§ 23 Abs. 4 WEG; § 16 Abs. 2 WEG',
      reason: 'Ein Beschluss ist gültig, solange er nicht rechtskräftig für ungültig erklärt ist (Ausnahme: nichtige Beschlüsse). Eine Gegenstimme befreit nach diesen Vorschriften nicht von der Zahlung.',
      reply: 'Ein gefasster Beschluss ist gültig, solange er nicht durch rechtskräftiges Urteil für ungültig erklärt ist; ausgenommen sind nichtige Beschlüsse (§ 23 Abs. 4 WEG). Eine Gegenstimme oder Abwesenheit lässt die Zahlungspflicht nach unserem Verständnis nicht entfallen.'
    },
    {
      id: 'beschluss-widerspruch-unwirksam', topic: 'beschluss-gueltigkeit', label: 'Wirksamkeit eines Beschlusses', negation: true,
      when: [/beschluss/i, /widersprochen|widerspruch|dagegen gestimmt|nicht zugestimmt/i, /unwirksam|ung(?:ü|ue)ltig|nicht (?:wirksam|bindend|gültig)|bindet mich nicht/i],
      deny: /nicht (?:automatisch |schon |deshalb |dadurch )?(?:unwirksam|ung(?:ü|ue)ltig)|\btrotz|dennoch/i,
      rating: 'fraglich', source: '§ 23 Abs. 4 WEG; § 44 Abs. 1 WEG',
      reason: 'Widerspruch oder Gegenstimme machen einen Beschluss nicht ungültig. Dafür braucht es ein Urteil auf eine Klage, außer der Beschluss ist nichtig.',
      reply: 'Ein Widerspruch oder eine Gegenstimme macht einen Beschluss nicht ungültig. Er gilt, solange ihn kein rechtskräftiges Urteil für ungültig erklärt (§ 23 Abs. 4, § 44 Abs. 1 WEG); ausgenommen sind nichtige Beschlüsse.'
    },
    {
      id: 'beschluss-nichtig', topic: 'beschluss-nichtig', label: 'Behauptete Nichtigkeit eines Beschlusses', negation: true,
      when: [/beschluss|beschl(?:ü|ue)sse/i, /\bnichtig/i],
      rating: 'unklar', source: '§ 23 Abs. 4 WEG',
      reason: 'Nichtig ist ein Beschluss nur bei Verstoß gegen eine unverzichtbare Rechtsvorschrift. Ob das hier zutrifft, ist eine Frage des Einzelfalls.',
      reply: 'Nichtig ist ein Beschluss nur unter engen Voraussetzungen (§ 23 Abs. 4 WEG). Ob diese vorliegen, prüfen wir anhand der Beschlussunterlagen.'
    },

    /* ───── WEG: Beschlussklage ───── */
    {
      id: 'anfechtung-frist-richtig', topic: 'anfechtung-frist', label: 'Frist der Anfechtungsklage',
      when: [/anfecht|angefochten|beschlu|beschl(?:ü|ue)ss/i, /erheb|erhoben|einreich|eingereicht|frist|innerhalb|binnen/i, /monat/i],
      forms: [form(SUIT, ' (?:muss|ist) ', within('n'), AFTER_VOTE, ' (?:erhoben werden|zu erheben|eingereicht werden|einzureichen)')],
      foreign: OWNER_FOREIGN, numbers: [1], allow: [/nach (?:der )?Beschlussfassung/],
      slots: { n: 1 },
      wrong: {
        reason: 'Die Frist zur Erhebung der Anfechtungsklage beträgt nach § 45 WEG einen Monat nach der Beschlussfassung, nicht die genannte Frist.',
        reply: 'Die Anfechtungsklage ist innerhalb eines Monats nach der Beschlussfassung zu erheben (§ 45 WEG).'
      },
      rating: 'belegt', source: '§ 45 WEG',
      reason: 'Die Anfechtungsklage ist innerhalb eines Monats nach der Beschlussfassung zu erheben.',
      reply: 'Die Anfechtungsklage ist innerhalb eines Monats nach der Beschlussfassung zu erheben und innerhalb zweier Monate nach der Beschlussfassung zu begründen (§ 45 WEG).'
    },
    {
      id: 'anfechtung-beide-fristen', topic: 'anfechtung-frist', label: 'Fristen der Anfechtungsklage',
      when: [/anfecht|angefochten|beschlu|beschl(?:ü|ue)ss/i, /erheb|erhoben|einreich|eingereicht/i, /begr(?:ü|ue)nd/i, /monat/i],
      forms: [form(SUIT, ' (?:muss|ist) ', within('a'), AFTER_VOTE, ' (?:erhoben(?: werden)?|zu erheben) und ', within('b'), AFTER_VOTE, ' (?:begründet werden|zu begründen)')],
      foreign: OWNER_FOREIGN, numbers: [1, 2], allow: [/nach (?:der )?Beschlussfassung/],
      slots: { a: 1, b: 2 },
      wrong: {
        reason: 'Nach § 45 WEG ist die Klage innerhalb eines Monats zu erheben und innerhalb zweier Monate zu begründen. Mindestens eine genannte Frist weicht davon ab.',
        reply: 'Die Anfechtungsklage ist innerhalb eines Monats nach der Beschlussfassung zu erheben und innerhalb zweier Monate nach der Beschlussfassung zu begründen (§ 45 WEG).'
      },
      rating: 'belegt', source: '§ 45 WEG',
      reason: 'Die Klage ist innerhalb eines Monats nach der Beschlussfassung zu erheben und innerhalb zweier Monate zu begründen.',
      reply: 'Die Anfechtungsklage ist innerhalb eines Monats nach der Beschlussfassung zu erheben und innerhalb zweier Monate nach der Beschlussfassung zu begründen (§ 45 WEG).'
    },
    {
      id: 'anfechtung-erhebung-zu-lang', topic: 'anfechtung-frist', label: 'Frist der Anfechtungsklage',
      when: [/anfecht|beschlu|beschl(?:ü|ue)ss/i, new RegExp(months(2).source + '[^.]{0,40}(?:erhoben|erheben|eingereicht|einzureichen)', 'i')],
      unless: [months(1)],
      rating: 'fraglich', source: '§ 45 WEG',
      reason: 'Die Klage ist innerhalb eines Monats zu erheben. Zwei Monate gelten nur für die Begründung.',
      reply: 'Die Anfechtungsklage ist innerhalb eines Monats nach der Beschlussfassung zu erheben; die Frist von zwei Monaten gilt nur für die Begründung (§ 45 WEG).'
    },
    {
      id: 'anfechtung-begruendung', topic: 'anfechtung-frist', label: 'Frist zur Begründung der Anfechtungsklage',
      when: [/anfecht|angefochten|beschlu|beschl(?:ü|ue)ss/i, /begr(?:ü|ue)nd/i, /monat/i],
      forms: [form(SUIT, ' (?:muss|ist) ', within('n'), AFTER_VOTE, ' (?:begründet werden|zu begründen)')],
      foreign: OWNER_FOREIGN, numbers: [2], allow: [/nach (?:der )?Beschlussfassung/],
      slots: { n: 2 },
      wrong: {
        reason: 'Die Frist zur Begründung der Anfechtungsklage beträgt nach § 45 WEG zwei Monate nach der Beschlussfassung, nicht die genannte Frist.',
        reply: 'Die Anfechtungsklage ist innerhalb zweier Monate nach der Beschlussfassung zu begründen; die Erhebungsfrist von einem Monat gilt daneben (§ 45 WEG).'
      },
      rating: 'belegt', source: '§ 45 WEG',
      reason: 'Die Klage ist innerhalb zweier Monate nach der Beschlussfassung zu begründen. Die Erhebungsfrist von einem Monat gilt daneben.',
      reply: 'Die Anfechtungsklage ist innerhalb eines Monats nach der Beschlussfassung zu erheben und innerhalb zweier Monate nach der Beschlussfassung zu begründen (§ 45 WEG).'
    },
    {
      id: 'anfechtung-frist-falsch', topic: 'anfechtung-frist', label: 'Frist der Anfechtungsklage',
      when: [/an(?:zu)?fecht|angefochten/i, /(?:innerhalb|binnen|frist|zeit)/i, new RegExp('(?:an(?:zu)?fecht|angefochten)[^.]{0,80}' + OTHER_APPEAL_PERIOD.source + '|' + OTHER_APPEAL_PERIOD.source + '[^.]{0,60}(?:an(?:zu)?fecht|angefochten)', 'i')],
      unless: [months(1), /begr(?:ü|ue)nd|mieterh|betriebskosten|mietvertrag|einlad|einberuf|vorher|zuvor|\bseit\b|vor (?:der|dem)|irrtum|t(?:ä|ae)uschung/i],
      deny: /nicht (?:etwa )?(?:\d+|zwei|drei|vier|sechs|vierzehn)[ -]?(?:tag|woche|monat)/i,
      rating: 'fraglich', source: '§ 45 WEG',
      reason: 'Die Frist für die Anfechtungsklage beträgt einen Monat ab Beschlussfassung (Begründung: zwei Monate). Die genannte Frist weicht davon ab.',
      reply: 'Für die Anfechtung eines Beschlusses gilt nach § 45 WEG: Die Klage ist innerhalb eines Monats nach der Beschlussfassung zu erheben und innerhalb zweier Monate nach der Beschlussfassung zu begründen.'
    },
    {
      id: 'anfechtung-fristbeginn-zugang', topic: 'anfechtung-beginn', label: 'Beginn der Anfechtungsfrist', negation: true,
      when: [/anfecht/i, /frist/i, /(?:erst )?(?:mit|ab|nach)[^.]{0,30}(?:zugang|zusendung|erhalt|versand|übersendung)[^.]{0,30}(?:protokoll|niederschrift)|(?:beginnt|l(?:ä|ae)uft)[^.]{0,60}(?:protokoll|niederschrift)/i],
      deny: /nicht (?:erst )?(?:mit|ab|nach|beim)/i,
      rating: 'fraglich', source: '§ 45 WEG',
      reason: 'Die Fristen laufen ab der Beschlussfassung, nicht ab Zugang der Niederschrift.',
      reply: 'Die Fristen für Klage und Begründung rechnen ab der Beschlussfassung, nicht ab dem Zugang des Protokolls (§ 45 WEG).'
    },
    {
      id: 'anfechtung-formlos', topic: 'anfechtung-form', label: 'Form der Anfechtung', negation: true,
      when: [/beschluss|beschl(?:ü|ue)ss/i, /(?:hiermit |ich )(?:fechte|widerspreche|lege[^.]{0,40}(?:widerspruch|einspruch))|(?:fechte|widerspreche)[^.]{0,60}hiermit|widerspruch (?:ein|gegen)|einspruch (?:ein|gegen)|(?:per|durch) (?:e-?mail|schreiben|brief)[^.]{0,40}(?:anfecht|angefochten)/i],
      unless: [/klage|gericht|mieterh|betriebskosten/i],
      deny: /(?:reicht|gen(?:ü|ue)gt) nicht|nicht (?:aus(?:zu)?)?reich|nicht (?:aus|m(?:ö|oe)glich)\b|wahrt[^.,]{0,40}nicht/i,
      rating: 'fraglich', source: '§ 44 Abs. 1 WEG; § 45 WEG',
      reason: 'Ein Beschluss wird nur durch eine Klage beim Gericht angefochten. Ein Schreiben an die Verwaltung wahrt die Klagefrist nicht.',
      reply: 'Ein Beschluss lässt sich nur durch eine Klage beim Gericht angreifen (§ 44 Abs. 1 WEG). Ein Schreiben an die Verwaltung wahrt die Klagefrist von einem Monat nicht (§ 45 WEG).'
    },
    {
      id: 'altes-recht-46', topic: 'altes-recht', label: 'Zitierte Vorschrift zur Anfechtung', negation: true,
      when: [/§ ?46\b[^§]{0,25}\bWEG|\bWEG\b[^§]{0,5}§ ?46\b/i, /anfecht|beschluss|klage|frist/i],
      deny: OLD_LAW_AWARE,
      rating: 'fraglich', source: '§§ 44, 45 WEG',
      reason: 'Zitiert wird offenbar altes Recht. Die Beschlussklagen und ihre Fristen stehen heute in §§ 44 und 45 WEG.',
      reply: 'Die von Ihnen zitierte Vorschrift entspricht nicht der geltenden Fassung. Beschlussklagen und Fristen regeln heute §§ 44 und 45 WEG.'
    },
    {
      id: 'altes-recht-22', topic: 'altes-recht', label: 'Zitierte Vorschrift zu baulichen Veränderungen', negation: true,
      when: [/§ ?22\b[^§]{0,25}\bWEG|\bWEG\b[^§]{0,5}§ ?22\b/i, /baulich|ver(?:ä|ae)nderung|modernisier|umbau/i],
      deny: OLD_LAW_AWARE,
      rating: 'fraglich', source: '§ 20 WEG',
      reason: 'Zitiert wird offenbar altes Recht. Bauliche Veränderungen regelt heute § 20 WEG; § 22 WEG betrifft den Wiederaufbau.',
      reply: 'Bauliche Veränderungen regelt heute § 20 WEG. Die von Ihnen zitierte Vorschrift entspricht nicht der geltenden Fassung.'
    },
    {
      id: 'altes-recht-21-4', topic: 'altes-recht', label: 'Zitierte Vorschrift zur ordnungsmäßigen Verwaltung', negation: true,
      when: [/§ ?21 Abs\.? ?4\b[^§]{0,10}\bWEG/i, /ordnungs(?:m(?:ä|ae)(?:ß|ss)ig|gem(?:ä|ae)(?:ß|ss))/i],
      deny: OLD_LAW_AWARE,
      rating: 'fraglich', source: '§ 18 Abs. 2 WEG',
      reason: 'Zitiert wird offenbar altes Recht. Den Anspruch auf ordnungsmäßige Verwaltung regelt heute § 18 Abs. 2 WEG.',
      reply: 'Den Anspruch auf eine ordnungsmäßige Verwaltung regelt heute § 18 Abs. 2 WEG. Er richtet sich an die Gemeinschaft der Wohnungseigentümer.'
    },

    /* ───── WEG: Verwaltung, Einsicht, Abrechnung, Versammlung ───── */
    {
      id: 'einsicht-unterlagen', topic: 'einsicht-weg', label: 'Einsicht in die Verwaltungsunterlagen',
      when: [/einsicht|einsehen/i, /verwaltungsunterlagen|(?:unterlagen|belege|kontoausz(?:ü|ue)ge|vertr(?:ä|ae)ge)[^.]{0,60}(?:verwalt|gemeinschaft|weg)|(?:weg|gemeinschaft)[^.]{0,60}(?:unterlagen|belege)|§ ?18 Abs\.? ?4/i],
      forms: [
        form(OWNER_HAS, ' (?:das Recht|(?:einen )?Anspruch),? (?:auf Einsicht in die ', RECORDS, '|Einsicht in die ', RECORDS, ' zu nehmen|die ', RECORDS, ' einzusehen)'),
        form(OWNER_CAN, '(?: von der Gemeinschaft(?: der Wohnungseigentümer)?)? (?:Einsicht in die ', RECORDS, ' (?:verlangen|nehmen)|die ', RECORDS, ' einsehen)')
      ],
      foreign: OWNER_FOREIGN, numbers: [], allow: [/jeder Wohnungseigentümer/],
      rating: 'belegt', source: '§ 18 Abs. 4 WEG',
      reason: 'Jeder Wohnungseigentümer kann von der Gemeinschaft Einsicht in die Verwaltungsunterlagen verlangen.',
      reply: 'Sie können Einsicht in die Verwaltungsunterlagen verlangen (§ 18 Abs. 4 WEG). Wir stimmen mit Ihnen einen Termin ab: [Terminvorschlag].'
    },
    {
      id: 'einsicht-kopien', topic: 'einsicht-kopien', label: 'Zusendung von Kopien', negation: true,
      when: [/kopie|scan|unterlagen|belege/i, /zusend|zuzusend|zuschick|zuzuschick|(?:ü|ue)bersend|(?:ü|ue)bermittel|(?:senden|schicken) sie|kosten(?:los|frei)|unentgeltlich/i, /verwaltungsunterlagen|(?:unterlagen|belege|kontoausz(?:ü|ue)ge|vertr(?:ä|ae)ge)/i, /anspruch|recht|verpflichtet|\bm(?:u|ü)ss|kostenlos|unentgeltlich|kostenfrei/i],
      unless: [TENANT],
      deny: /kein\w* (?:anspruch|recht|pflicht)|nicht verpflichtet|(?:muss|m(?:ü|ue)ssen)[^.,]{0,40}nicht/i,
      rating: 'fraglich', source: '§ 18 Abs. 4 WEG',
      reason: 'Der Wortlaut gibt ein Recht auf Einsicht. Einen Anspruch auf (kostenlose) Zusendung von Kopien nennt er nicht.',
      reply: '§ 18 Abs. 4 WEG gewährt Einsicht in die Verwaltungsunterlagen. Eine Pflicht zur kostenlosen Zusendung von Kopien nennt die Vorschrift nicht. Gern vereinbaren wir einen Einsichtstermin: [Terminvorschlag].'
    },
    {
      id: 'einsicht-frist', topic: 'einsicht-frist', label: 'Frist für die Einsicht', negation: true,
      when: [/einsicht/i, /unterlagen|belege/i, /(?:innerhalb|binnen) (?:von )?\S+ (?:werk|arbeits)?(?:tag|woche)/i, /gesetzlich|nach dem gesetz|laut gesetz|§ ?18|verpflichtet|\bm(?:u|ü)ss/i],
      unless: [TENANT, /\bbitte|\bsetze\b/i],
      deny: /keine?[^.,]{0,20}frist|nicht (?:innerhalb|binnen)|nicht verpflichtet/i,
      rating: 'fraglich', source: '§ 18 Abs. 4 WEG',
      reason: 'Die Vorschrift nennt keine feste Frist für die Einsicht.',
      reply: '§ 18 Abs. 4 WEG nennt keine feste Frist für die Einsicht. Wir bieten Ihnen zeitnah einen Termin an: [Terminvorschlag].'
    },
    {
      id: 'abrechnung-aufstellen', topic: 'abrechnung-pflicht', label: 'Aufstellung der Jahresabrechnung',
      when: [WEG_ACCOUNT, /verwalter|verwaltung/i, /aufstell|aufzustellen|erstell/i],
      unless: [TENANT],
      forms: [
        form('Der Verwalter (?:ist verpflichtet|hat),? ', AFTER_YEAR, '(?:eine|die) Jahresabrechnung (?:aufzustellen|zu erstellen)'),
        form('Der Verwalter muss ', AFTER_YEAR, '(?:eine|die) Jahresabrechnung (?:aufstellen|erstellen)')
      ],
      foreign: ['mieter', 'vermieter', 'beirat', 'nachbar'], numbers: [], allow: [/nach Ablauf (?:des|eines) Kalenderjahres/],
      rating: 'belegt', source: '§ 28 Abs. 2 WEG',
      reason: 'Nach Ablauf des Kalenderjahres hat der Verwalter eine Abrechnung über den Wirtschaftsplan (Jahresabrechnung) aufzustellen.',
      reply: 'Der Verwalter hat nach Ablauf des Kalenderjahres die Jahresabrechnung aufzustellen (§ 28 Abs. 2 WEG). Den Stand für [Objekt] teilen wir Ihnen mit: [Stand].'
    },
    {
      id: 'abrechnung-feste-frist', topic: 'abrechnung-frist', label: 'Frist für die Jahresabrechnung', negation: true,
      when: [WEG_ACCOUNT, /(?:gesetzlich|nach dem gesetz|laut gesetz|§ ?28)/i, /bis (?:zum|spätestens)|sp(?:ä|ae)testens|innerhalb|binnen|frist|\d{1,2}\.\d{1,2}\./i],
      unless: [TENANT, /§ ?556/i],
      deny: /kein\w*[^.,]{0,30}(?:frist|termin)|nicht (?:\w+ )?(?:geregelt|vorgesehen|bestimmt)|nicht (?:bis|innerhalb|binnen)/i,
      rating: 'fraglich', source: '§ 28 Abs. 2 WEG',
      reason: '§ 28 Abs. 2 WEG nennt keinen festen Termin für die Jahresabrechnung. Ein Termin kann sich aus Vertrag oder Beschluss ergeben; das ist gesondert zu prüfen.',
      reply: '§ 28 Abs. 2 WEG nennt keinen festen Termin für die Jahresabrechnung. Ob für [Objekt] ein Termin vereinbart oder beschlossen ist, prüfen wir und nennen Ihnen den Stand: [Stand].'
    },
    {
      id: 'abrechnung-mietrecht', topic: 'abrechnung-mietrecht', label: 'Anwendung von Mietrecht auf die Jahresabrechnung', negation: true,
      when: [WEG_ACCOUNT, /§ ?556/i],
      unless: [TENANT],
      deny: /(?:gilt|anwendbar|findet)[^.]{0,40}(?:nicht|keine)|nicht (?:nach|gem|anwendbar|§)/i,
      rating: 'fraglich', source: '§ 556 Abs. 3 BGB; § 28 Abs. 2 WEG',
      reason: '§ 556 Abs. 3 BGB regelt die Betriebskostenabrechnung im Mietverhältnis. Für die Jahresabrechnung der Gemeinschaft gilt § 28 Abs. 2 WEG.',
      reply: '§ 556 Abs. 3 BGB betrifft die Abrechnung zwischen Vermieter und Mieter. Für die Jahresabrechnung der Gemeinschaft gilt § 28 Abs. 2 WEG.'
    },
    {
      id: 'nachschuss-erst-beschluss', topic: 'nachschuss', label: 'Nachschüsse aus der Jahresabrechnung',
      when: [/nachsch(?:uss|üsse)|nachzahlung|abrechnungsspitze/i, /beschlu|beschlie(?:ß|ss)|beschl(?:ü|ue)ss/i],
      unless: [TENANT],
      forms: [
        form('Über (?:die Einforderung von )?Nachschüssen? beschließen die Wohnungseigentümer'),
        form('Die Wohnungseigentümer beschließen über (?:die Einforderung von )?Nachschüssen?')
      ],
      foreign: ['mieter', 'vermieter', 'verwalter', 'beirat', 'nachbar'], numbers: [],
      rating: 'belegt', source: '§ 28 Abs. 2 WEG',
      reason: 'Über die Einforderung von Nachschüssen beschließen die Wohnungseigentümer nach Ablauf des Kalenderjahres.',
      reply: 'Über die Einforderung von Nachschüssen beschließen die Wohnungseigentümer (§ 28 Abs. 2 WEG). Wir prüfen, ob für [Objekt] bereits ein Beschluss vorliegt.'
    },
    {
      id: 'vermoegensbericht', topic: 'vermoegensbericht', label: 'Vermögensbericht',
      when: [/verm(?:ö|oe)gensbericht/i],
      forms: [
        form('Der Verwalter (?:ist verpflichtet|hat),? ', AFTER_YEAR, '(?:einen|den) Vermögensbericht (?:aufzustellen|zu erstellen)'),
        form('Der Verwalter muss ', AFTER_YEAR, '(?:einen|den) Vermögensbericht erstellen'),
        form('(?:Der|Ein) Vermögensbericht ist jedem Wohnungseigentümer zur Verfügung zu stellen'),
        form(OWNER_HAS, ' (?:einen )?Anspruch auf (?:den|einen) Vermögensbericht')
      ],
      foreign: ['mieter', 'vermieter', 'beirat', 'nachbar'], numbers: [],
      allow: [/nach Ablauf (?:des|eines) Kalenderjahres/, /jede[mr] Wohnungseigentümer/],
      rating: 'belegt', source: '§ 28 Abs. 4 WEG',
      reason: 'Der Verwalter hat nach Ablauf eines Kalenderjahres einen Vermögensbericht zu erstellen und jedem Wohnungseigentümer zur Verfügung zu stellen.',
      reply: 'Der Vermögensbericht ist jedem Wohnungseigentümer zur Verfügung zu stellen (§ 28 Abs. 4 WEG). Den Stand für [Objekt] teilen wir Ihnen mit: [Stand].'
    },
    {
      id: 'ordnungsmaessige-verwaltung', topic: 'ordnungsmaessige-verwaltung', label: 'Ordnungsmäßige Verwaltung',
      when: [/ordnungsm(?:ä|ae)(?:ß|ss)ige[nr]? verwaltung/i],
      forms: [
        form(OWNER_HAS, ' (?:einen |ein )?(?:Anspruch|Recht) auf (?:eine )?ordnungsmäßige Verwaltung'),
        form(OWNER_CAN, ' von der Gemeinschaft(?: der Wohnungseigentümer)? (?:eine )?ordnungsmäßige Verwaltung verlangen')
      ],
      foreign: OWNER_FOREIGN, numbers: [], allow: [/jeder Wohnungseigentümer/],
      rating: 'belegt', source: '§ 18 Abs. 2 WEG',
      reason: 'Jeder Wohnungseigentümer kann von der Gemeinschaft eine ordnungsmäßige Verwaltung verlangen. Der Anspruch richtet sich an die Gemeinschaft.',
      reply: 'Sie können von der Gemeinschaft der Wohnungseigentümer eine ordnungsmäßige Verwaltung verlangen (§ 18 Abs. 2 WEG). Welche konkrete Maßnahme daraus folgt, prüfen wir.'
    },
    {
      id: 'einladung-zu-kurz', topic: 'einladungsfrist', label: 'Einberufungsfrist', negation: true,
      when: [/einberuf|einladung/i, /(?<![\d,.])\b(?:1|eine|2|zwei)[ -]wochen?\b|(?<![\d,.])\b(?:7|10|14|sieben|zehn|vierzehn) tage/i, /frist|gesetzlich|reicht|gen(?:ü|ue)gt|mindestens|vorgeschrieben/i],
      deny: /(?:reich(?:t|en)|gen(?:ü|ue)g(?:t|en)) nicht|zu kurz|nicht (?:aus(?:ge)?reich|eingehalten|gewahrt)|unterschritten|\bstatt\b|nur (?:zwei|2|eine|10|14)/i,
      rating: 'fraglich', source: '§ 24 Abs. 4 WEG',
      reason: 'Die Einberufungsfrist soll mindestens drei Wochen betragen, außer bei besonderer Dringlichkeit.',
      reply: 'Die Einberufungsfrist soll mindestens drei Wochen betragen, außer in Fällen besonderer Dringlichkeit (§ 24 Abs. 4 WEG).'
    },
    {
      id: 'einladung-drei-wochen', topic: 'einladungsfrist', label: 'Einberufungsfrist',
      when: [/einberuf|einladung/i, /woche|monat|\btage?n?\b/i],
      forms: [
        form(NOTICE, ' beträgt (?:mindestens )?(?<n>', NUM, ') Wochen?'),
        form(NOTICE, ' soll (?:mindestens )?(?<n>', NUM, ') Wochen? betragen'),
        form('Die (?:Einladung|Einberufung)(?: zur (?:Eigentümer)?versammlung)? soll mindestens (?<n>', NUM, ') Wochen? (?:vorher|vor der Versammlung) (?:erfolgen|zugehen|verschickt werden)')
      ],
      foreign: ['mieter', 'vermieter', 'beirat', 'nachbar'], numbers: [3], allow: [/mindestens/],
      slots: { n: 3 },
      wrong: {
        reason: 'Die Einberufungsfrist soll nach § 24 Abs. 4 WEG mindestens drei Wochen betragen (Ausnahme bei besonderer Dringlichkeit). Die genannte Frist weicht davon ab.',
        reply: 'Die Einberufungsfrist soll mindestens drei Wochen betragen, außer in Fällen besonderer Dringlichkeit (§ 24 Abs. 4 WEG).'
      },
      rating: 'belegt', source: '§ 24 Abs. 4 WEG',
      reason: 'Die Einberufungsfrist soll mindestens drei Wochen betragen (Soll-Vorschrift; Ausnahme bei besonderer Dringlichkeit).',
      reply: 'Die Einberufungsfrist soll mindestens drei Wochen betragen (§ 24 Abs. 4 WEG). Die Daten der Einladung prüfen wir.'
    },
    {
      id: 'abberufung-nur-wichtiger-grund', topic: 'abberufung', label: 'Abberufung des Verwalters', negation: true,
      when: [/verwalter/i, /abberuf|abberufen|abgew(?:ä|ae)hlt/i, /nur[^.]{0,40}wichtige(?:m|n) grund/i],
      deny: /nicht (?:nur|blo(?:ß|ss)|lediglich)/i,
      rating: 'fraglich', source: '§ 26 Abs. 3 WEG',
      reason: 'Der Verwalter kann jederzeit abberufen werden. Einen wichtigen Grund verlangt die Vorschrift nicht.',
      reply: 'Der Verwalter kann nach § 26 Abs. 3 WEG jederzeit abberufen werden. Ein wichtiger Grund ist dafür nach dem Gesetz nicht erforderlich.'
    },

    /* ───── WEG: bauliche Veränderungen ───── */
    {
      id: 'bau-anspruch-privilegiert', topic: 'bau-anspruch', label: 'Anspruch auf eine privilegierte bauliche Veränderung',
      when: [PRIVILEGED, ENTITLED, /wallbox|lade|anspruch|gestatt|genehmig|installation|anbring|einbau|errichtung|balkonkraftwerk|steckersolar/i],
      unless: [WITHOUT_RESOLUTION, /\bmiet|vermieter/i],
      forms: [
        form('(?:Als ', OWNER, ' habe ich|Ich habe als ', OWNER, ') (?:einen )?Anspruch darauf, dass mir (?:der Einbau|die Installation|die Errichtung|die Anbringung) ', DEVICE, PARKING, ' (?:gestattet|erlaubt|genehmigt) wird'),
        form(OWNER_HAS, ' (?:einen )?Anspruch auf (?:die )?Gestattung (?:des Einbaus|der Installation) ', DEVICE, PARKING),
        form('Jeder Wohnungseigentümer kann angemessene bauliche Veränderungen verlangen, die dem Laden elektrisch betriebener Fahrzeuge dienen')
      ],
      foreign: OWNER_FOREIGN, numbers: [], allow: [/jeder Wohnungseigentümer/],
      rating: 'belegt', source: '§ 20 Abs. 2 WEG',
      reason: 'Das Gesetz gibt einen Anspruch auf angemessene Veränderungen für diesen Zweck. Über die Durchführung ist trotzdem zu beschließen.',
      reply: 'Für Maßnahmen dieser Art sieht § 20 Abs. 2 WEG einen Anspruch auf angemessene bauliche Veränderungen vor. Über die Durchführung beschließen die Wohnungseigentümer. Wir bereiten dazu einen Tagesordnungspunkt vor und benötigen von Ihnen eine Beschreibung des Vorhabens.'
    },
    {
      id: 'bau-ohne-beschluss', topic: 'bau-beschluss', label: 'Bauliche Veränderung ohne Beschluss', negation: true,
      when: [new RegExp(PRIVILEGED.source + '|klimaanlage|klimager(?:ä|ae)t|markise|wintergarten|durchbruch|au(?:ß|ss)enjalousie|bauliche', 'i'), WITHOUT_RESOLUTION, /\b(?:ich|wir)\b|darf|kann|erforderlich|n(?:ö|oe)tig|notwendig|brauch|ben(?:ö|oe)tig/i],
      deny: /(?:darf|d(?:ü|ue)rfen|kann|k(?:ö|oe)nnen)[^.,]{0,40}(?:nicht|kein)|(?:nicht|kein\w*)[^.,]{0,20}(?:erlaubt|zul(?:ä|ae)ssig|m(?:ö|oe)glich)|unzul(?:ä|ae)ssig|verboten|ohne (?:beschluss|zustimmung)[^.]{0,50}\bnicht (?:\w+ )?(?:errichten|installieren|anbringen|bauen|einbauen)/i,
      unless: [/\bmiet|vermieter/i],
      rating: 'fraglich', source: '§ 20 Abs. 1 und 2 WEG',
      reason: 'Bauliche Veränderungen werden beschlossen oder durch Beschluss gestattet. Auch bei einem Anspruch ist über die Durchführung zu beschließen.',
      reply: 'Bauliche Veränderungen am gemeinschaftlichen Eigentum brauchen einen Beschluss; das gilt auch dort, wo ein Anspruch besteht (§ 20 Abs. 1 und 2 WEG). Bitte führen Sie die Maßnahme nicht vor einem Beschluss aus.'
    },
    {
      id: 'bau-kosten-gemeinschaft', topic: 'bau-kosten', label: 'Kosten der baulichen Veränderung', negation: true,
      when: [PRIVILEGED, /kosten|bezahl|zahlen/i, /(?:gemeinschaft|alle(?:n)? (?:eigent(?:ü|ue)mer)?|weg)[^.]{0,60}(?:tragen|trägt|zahlen|zahlt|übernehmen|übernimmt|bezahl)|(?:tragen|trägt|übernehmen|übernimmt)[^.]{0,60}(?:die )?gemeinschaft|zulasten der gemeinschaft/i, /\bmuss|hat[^.]{0,40}zu tragen|verpflichtet|anspruch/i],
      deny: /(?:muss|m(?:ü|ue)ssen|hat|braucht)[^.,]{0,50}nicht|nicht (?:zu )?(?:tragen|zahlen|(?:ü|ue)bernehmen|bezahlen)|keine kosten/i,
      unless: [/\bmiet|vermieter/i, MAJORITY],
      rating: 'fraglich', source: '§ 21 Abs. 1 WEG',
      reason: 'Wird die Veränderung auf Verlangen eines Eigentümers durchgeführt oder ihm gestattet, trägt dieser Eigentümer die Kosten.',
      reply: 'Die Kosten einer baulichen Veränderung, die einem Wohnungseigentümer gestattet oder auf sein Verlangen durchgeführt wird, trägt dieser Eigentümer (§ 21 Abs. 1 WEG).'
    },
    {
      id: 'bau-kosten-mehrheit', topic: 'bau-kosten', label: 'Kosten der baulichen Veränderung', negation: true,
      when: [new RegExp(PRIVILEGED.source + '|bauliche', 'i'), /kosten|bezahl|zahlen/i, MAJORITY],
      unless: [/\bmiet|vermieter/i],
      rating: 'unklar', source: '§ 21 Abs. 2 WEG',
      reason: 'Bei einem Beschluss mit qualifizierter Mehrheit oder bei Amortisation können alle Wohnungseigentümer die Kosten zu tragen haben (vorbehaltlich § 21 Abs. 1 WEG). Das hängt vom Beschluss und vom Sachverhalt ab.',
      reply: 'Wer die Kosten trägt, hängt hier unter anderem vom Beschluss und seinen Mehrheiten ab (§ 21 Abs. 2 WEG). Wir prüfen die Beschlussunterlagen.'
    },
    {
      id: 'bau-nicht-privilegiert', topic: 'bau-anspruch-sonstige', label: 'Anspruch auf eine sonstige bauliche Veränderung',
      when: [/klimaanlage|klimager(?:ä|ae)t|markise|wintergarten|au(?:ß|ss)enjalousie|satellitensch(?:ü|ue)ssel|pergola/i, ENTITLED],
      unless: [WITHOUT_RESOLUTION, PRIVILEGED, /\bmiet|vermieter/i],
      rating: 'unklar', source: '§ 20 Abs. 3 und 4 WEG',
      reason: 'Diese Maßnahme steht nicht in der Liste des § 20 Abs. 2 WEG. Ein Anspruch hängt davon ab, wer beeinträchtigt wird und ob die Betroffenen einverstanden sind.',
      reply: 'Ein Anspruch auf diese Veränderung hängt nach § 20 Abs. 3 und 4 WEG davon ab, ob andere Wohnungseigentümer beeinträchtigt werden und ob sie einverstanden sind. Wir prüfen das anhand Ihrer Beschreibung.'
    },
    {
      id: 'notmassnahme', topic: 'notmassnahme', label: 'Eigene Notmaßnahme', negation: true,
      when: [/notma(?:ß|ss)nahme|notgesch(?:ä|ae)ftsf(?:ü|ue)hrung|unmittelbar drohende|§ ?18 Abs\.? ?3/i],
      rating: 'unklar', source: '§ 18 Abs. 3 WEG',
      reason: 'Das Recht besteht nur für Maßnahmen, die zur Abwendung eines unmittelbar drohenden Schadens notwendig sind. Das hängt vom Sachverhalt ab.',
      reply: 'Ein eigenes Handeln erlaubt § 18 Abs. 3 WEG nur bei einem unmittelbar drohenden Schaden am gemeinschaftlichen Eigentum und nur im notwendigen Umfang. Bitte senden Sie uns Beschreibung, Zeitpunkt und Belege.'
    },

    /* ───── Mietrecht: Betriebskosten ───── */
    {
      id: 'bk-frist-12', topic: 'bk-frist', label: 'Abrechnungsfrist der Betriebskosten',
      when: [new RegExp(UTILITY.source + '|abrechnungszeitraum', 'i'), /monat/i, /sp(?:ä|ae)t|frist|innerhalb|binnen|bis zum|ausgeschlossen|nachforderung|verfristet|abgelaufen/i],
      unless: [/einwend|§ ?28|jahresabrechnung/i],
      forms: [
        form(UTILITY_BILL, ' (?:muss|ist) (?:dem Mieter )?(?:spätestens )?', within('n'), PERIOD_END, DELIVERED),
        form(UTILITY_BILL, ' (?:muss|ist) (?:dem Mieter )?(?:spätestens )?bis zum Ablauf des zwölften Monats', PERIOD_END, DELIVERED)
      ],
      foreign: TENANCY_FOREIGN, numbers: [12],
      allow: [/sp(?:ä|ae)testens/, /bis zum Ablauf des zwölften Monats/, /nach (?:dem )?Ende des Abrechnungszeitraums/],
      slots: { n: 12 },
      wrong: {
        reason: 'Die Abrechnungsfrist beträgt nach § 556 Abs. 3 BGB zwölf Monate nach Ende des Abrechnungszeitraums, nicht die genannte Frist.',
        reply: 'Die gesetzliche Frist für die Betriebskostenabrechnung endet mit Ablauf des zwölften Monats nach Ende des Abrechnungszeitraums (§ 556 Abs. 3 BGB).'
      },
      rating: 'belegt', source: '§ 556 Abs. 3 BGB',
      reason: 'Die Abrechnung ist spätestens bis zum Ablauf des zwölften Monats nach Ende des Abrechnungszeitraums mitzuteilen; danach ist eine Nachforderung grundsätzlich ausgeschlossen (Ausnahme: Vermieter hat die Verspätung nicht zu vertreten). Ob die Frist hier abgelaufen ist, ist anhand der Daten zu prüfen.',
      reply: 'Die Abrechnung ist spätestens bis zum Ablauf des zwölften Monats nach Ende des Abrechnungszeitraums mitzuteilen. Danach ist eine Nachforderung ausgeschlossen, es sei denn, der Vermieter hat die Verspätung nicht zu vertreten (§ 556 Abs. 3 BGB). Wir prüfen Abrechnungszeitraum und Zugangsdatum.'
    },
    {
      id: 'bk-frist-falsch', topic: 'bk-frist', label: 'Abrechnungsfrist der Betriebskosten', negation: true,
      when: [UTILITY, /(?:innerhalb|binnen|frist(?: von)?|sp(?:ä|ae)testens(?: nach)?) (?:(?:von|der ersten) )?(?:3|drei|4|vier|6|sechs|9|neun)[ -]monat|(?<![\d,.])\b(?:3|drei|4|vier|6|sechs|9|neun)[ -]?monat\w*[ -]?frist/i, /abrechn|nachforder|erstell|zugeh|zugegangen|mitgeteilt/i],
      unless: [/einwend|widerspr|nach zugang|zahlungsfrist|k(?:ü|ue)ndig|belege|bitte|erstatt|guthaben|(?:ü|ue)berweis|r(?:ü|ue)ckzahl/i],
      deny: /nicht (?:innerhalb|binnen)|keine?[^.,]{0,15}(?:frist|pflicht)/i,
      rating: 'fraglich', source: '§ 556 Abs. 3 BGB',
      reason: 'Die gesetzliche Abrechnungsfrist beträgt zwölf Monate nach Ende des Abrechnungszeitraums, nicht die genannte Frist.',
      reply: 'Die gesetzliche Frist für die Betriebskostenabrechnung endet mit Ablauf des zwölften Monats nach Ende des Abrechnungszeitraums (§ 556 Abs. 3 BGB).'
    },
    {
      id: 'bk-einwendung-12', topic: 'bk-einwendung', label: 'Frist für Einwendungen gegen die Abrechnung',
      when: [/einwend|abrechnung[^.]{0,40}widersprech/i, /monat/i],
      unless: [/§ ?28|jahresabrechnung/i],
      forms: [
        form(OBJECTION, ' (?:sind|muss ich|muss der Mieter) (?:dem Vermieter )?(?:spätestens )?', within('n'), AFTER_ACCESS, ' (?:mitzuteilen|mitteilen|zu erheben|erheben)'),
        form(OBJECTION, ' müssen (?:dem Vermieter )?(?:spätestens )?', within('n'), AFTER_ACCESS, ' (?:mitgeteilt|erhoben) werden'),
        form(OBJECTION, ' sind (?:dem Vermieter )?(?:spätestens )?bis zum Ablauf des zwölften Monats', AFTER_ACCESS, ' mitzuteilen')
      ],
      foreign: TENANCY_FOREIGN, numbers: [12],
      allow: [/sp(?:ä|ae)testens/, /bis zum Ablauf des zwölften Monats/, /nach (?:dem )?Zugang(?: der Abrechnung)?/],
      slots: { n: 12 },
      wrong: {
        reason: 'Die Frist für Einwendungen beträgt nach § 556 Abs. 3 BGB zwölf Monate nach Zugang der Abrechnung, nicht die genannte Frist.',
        reply: 'Einwendungen gegen die Abrechnung sind spätestens bis zum Ablauf des zwölften Monats nach Zugang mitzuteilen (§ 556 Abs. 3 BGB).'
      },
      rating: 'belegt', source: '§ 556 Abs. 3 BGB',
      reason: 'Einwendungen sind spätestens bis zum Ablauf des zwölften Monats nach Zugang der Abrechnung mitzuteilen.',
      reply: 'Einwendungen gegen die Abrechnung sind spätestens bis zum Ablauf des zwölften Monats nach Zugang mitzuteilen (§ 556 Abs. 3 BGB). Bitte benennen Sie die beanstandeten Positionen.'
    },
    {
      id: 'bk-einwendung-unbegrenzt', topic: 'bk-einwendung', label: 'Frist für Einwendungen gegen die Abrechnung', negation: true,
      when: [/einwend|abrechnung[^.]{0,60}(?:widersprech|beanstand)|(?:widersprech|beanstand)[^.]{0,60}abrechnung/i, /jederzeit|unbegrenzt|ohne (?:jede )?frist|keine[r]? frist|auch (?:noch )?nach jahren|zeitlich nicht begrenzt/i],
      unless: [/jahresabrechnung|hausgeld/i],
      deny: /nicht (?:jederzeit|unbegrenzt|ohne)|(?:jederzeit|unbegrenzt)[^.,]{0,30}\bnicht\b/i,
      rating: 'fraglich', source: '§ 556 Abs. 3 BGB',
      reason: 'Für Einwendungen gilt eine Frist von zwölf Monaten nach Zugang der Abrechnung (Ausnahme: Mieter hat die Verspätung nicht zu vertreten).',
      reply: 'Für Einwendungen gilt eine Frist: Sie sind bis zum Ablauf des zwölften Monats nach Zugang der Abrechnung mitzuteilen, es sei denn, der Mieter hat die Verspätung nicht zu vertreten (§ 556 Abs. 3 BGB).'
    },
    {
      id: 'bk-belege', topic: 'bk-belege', label: 'Einsicht in die Abrechnungsbelege',
      when: [/beleg/i, /einsicht|einsehen/i, new RegExp(TENANT.source + '|§ ?556', 'i')],
      forms: [
        form('(?:Als Mieter(?:in)? habe ich|Ich habe als Mieter(?:in)?|Der Mieter hat)(?: außerdem)? (?:(?:einen )?Anspruch|das Recht) auf Einsicht in ', RECEIPTS),
        form('Der Vermieter muss (?:mir |dem Mieter )?(?:auf Verlangen )?Einsicht in ', RECEIPTS, ' gewähren')
      ],
      foreign: TENANCY_FOREIGN, numbers: [],
      rating: 'belegt', source: '§ 556 Abs. 4 BGB',
      reason: 'Der Vermieter hat auf Verlangen Einsicht in die Belege zur Abrechnung zu gewähren; er darf sie elektronisch bereitstellen.',
      reply: 'Auf Verlangen erhalten Sie Einsicht in die Belege zur Abrechnung (§ 556 Abs. 4 BGB). Die Belege können auch elektronisch bereitgestellt werden. Vorschlag: [Termin oder Übermittlungsweg].'
    },
    {
      id: 'bk-belege-kopien', topic: 'bk-belege-kopien', label: 'Zusendung von Belegkopien', negation: true,
      when: [/beleg/i, /kopie|zusenden|zuschicken|per post|original/i, new RegExp(TENANT.source + '|§ ?556', 'i'), /anspruch|recht|verpflichtet|\bm(?:u|ü)ss|kostenlos|kostenfrei/i],
      rating: 'unklar', source: '§ 556 Abs. 4 BGB',
      reason: 'Das Gesetz nennt die Einsicht und erlaubt die elektronische Bereitstellung. Ob darüber hinaus Kopien oder Originale verlangt werden können, hängt vom Einzelfall ab.',
      reply: 'Nach § 556 Abs. 4 BGB gewähren wir Einsicht in die Belege, auch in elektronischer Form. Ihren weitergehenden Wunsch prüfen wir.'
    },
    {
      id: 'bk-vereinbarung', topic: 'bk-vereinbarung', label: 'Vereinbarung über Betriebskosten',
      when: [/betriebskosten|nebenkosten/i, /vereinbar/i],
      forms: [
        form('Der Mieter (?:trägt|zahlt) (?:die )?(?:Betriebs|Neben)kosten, ', IF_AGREED),
        form('(?:Betriebs|Neben)kosten (?:trägt|zahlt) der Mieter, ', IF_AGREED)
      ],
      foreign: TENANCY_FOREIGN, numbers: [], allow: [/wenn (?:dies|das) (?:im Mietvertrag )?vereinbart (?:ist|wurde)/],
      rating: 'belegt', source: '§ 556 Abs. 1 BGB',
      reason: 'Der Mieter trägt Betriebskosten, wenn die Vertragsparteien das vereinbart haben.',
      reply: 'Betriebskosten trägt der Mieter, wenn dies vereinbart ist (§ 556 Abs. 1 BGB). Wir prüfen die Regelung in Ihrem Mietvertrag.'
    },

    /* ───── Mietrecht: Mangel und Minderung ───── */
    {
      id: 'minderung-ohne-anzeige', topic: 'minderung-anzeige', label: 'Minderung ohne oder vor der Mängelanzeige', negation: true,
      when: [/minder|mindere|k(?:ü|ue)rz/i, /\bmiete|mietmind/i, /ohne[^.]{0,30}(?:anzeige|meldung|ank(?:ü|ue)ndigung)|(?:nicht|nie) (?:gemeldet|angezeigt)|(?:anzeige|meldung)[^.]{0,30}nicht (?:nötig|erforderlich|notwendig)/i],
      deny: /(?:darf|kann|d(?:ü|ue)rfen|k(?:ö|oe)nnen)[^.,]{0,40}(?:nicht|kein)|(?:nicht|kein\w*) (?:zul(?:ä|ae)ssig|m(?:ö|oe)glich|erlaubt)|ausgeschlossen/i,
      rating: 'fraglich', source: '§ 536c BGB',
      reason: 'Mängel sind unverzüglich anzuzeigen. Soweit der Vermieter wegen der fehlenden Anzeige nicht abhelfen konnte, darf nicht gemindert werden.',
      reply: 'Ein Mangel ist dem Vermieter unverzüglich anzuzeigen. Soweit wegen einer fehlenden Anzeige keine Abhilfe möglich war, besteht kein Recht zur Minderung (§ 536c BGB). Bitte nennen Sie uns, wann Sie den Mangel gemeldet haben.'
    },
    {
      id: 'minderung-rueckwirkend', topic: 'minderung-rueckwirkend', label: 'Rückwirkende Mietminderung', negation: true,
      when: [/minder|mindere|k(?:ü|ue)rz/i, /\bmiete|mietmind/i, /r(?:ü|ue)ckwirkend/i],
      rating: 'unklar', source: '§ 536 Abs. 1 BGB; § 536c BGB',
      reason: 'Ob rückwirkend gemindert werden kann, hängt unter anderem davon ab, wann der Mangel bestand und angezeigt wurde und wie die Miete gezahlt wurde.',
      reply: 'Ob eine rückwirkende Minderung in Betracht kommt, hängt vom Einzelfall ab, insbesondere vom Zeitpunkt der Mängelanzeige (§ 536c BGB). Bitte nennen Sie uns, wann der Mangel auftrat und wann Sie ihn gemeldet haben.'
    },
    {
      id: 'minderung-quote', topic: 'minderung-quote', label: 'Höhe der Mietminderung', negation: true,
      when: [/minder|mindere|k(?:ü|ue)rz|einbehalt|behalte/i, /\bmiete|mietmind/i, /\d{1,3} ?(?:%|prozent)/i],
      unless: [MODERNIZATION, /mieterh/i],
      rating: 'unklar', source: '§ 536 Abs. 1 BGB',
      reason: 'Das Gesetz nennt keine Quoten. Die Miete ist angemessen herabgesetzt; unerhebliche Mängel bleiben außer Betracht. Die Höhe hängt vom Einzelfall ab.',
      reply: '§ 536 Abs. 1 BGB sieht eine angemessene Herabsetzung vor und nennt keine feste Quote. Die von Ihnen angesetzte Höhe bestätigen wir nicht ungeprüft. Bitte beschreiben Sie Art, Dauer und Auswirkung des Mangels.'
    },
    {
      id: 'minderung-modernisierung', topic: 'minderung-modernisierung', label: 'Minderung während einer energetischen Modernisierung', negation: true,
      when: [/energetisch/i, /minder|mindere|k(?:ü|ue)rz/i, /sofort|ab (?:dem )?(?:ersten|beginn)|von beginn|vom ersten|unmittelbar/i],
      deny: /(?:darf|kann)[^.,]{0,30}nicht|nicht (?:sofort|ab|von)|\bkein/i,
      rating: 'fraglich', source: '§ 536 Abs. 1a BGB',
      reason: 'Bei Maßnahmen für eine energetische Modernisierung bleibt eine Minderung der Tauglichkeit drei Monate lang außer Betracht.',
      reply: 'Bei einer energetischen Modernisierung bleibt eine dadurch verursachte Minderung der Tauglichkeit für drei Monate außer Betracht (§ 536 Abs. 1a BGB).'
    },
    {
      id: 'minderung-grundsatz', topic: 'minderung', label: 'Mietminderung bei einem Mangel',
      when: [/mangel|m(?:ä|ae)ngel/i, /minder|mindere|herabgesetzt/i],
      forms: [
        form('Bei einem Mangel (?:bin ich berechtigt, die Miete zu mindern|(?:darf|kann) (?:ich|der Mieter) die Miete mindern|ist der Mieter berechtigt, die Miete zu mindern)'),
        form('Der Mieter (?:darf|kann) bei einem Mangel die Miete mindern')
      ],
      foreign: [...TENANCY_FOREIGN, 'vermieter'], numbers: [],
      rating: 'belegt', source: '§ 536 Abs. 1 BGB',
      reason: 'Bei einem Mangel, der die Tauglichkeit mindert, ist nur eine angemessen herabgesetzte Miete zu zahlen. Unerhebliche Mängel zählen nicht. Ob ein solcher Mangel vorliegt, ist zu prüfen.',
      reply: 'Mindert ein Mangel die Tauglichkeit der Wohnung nicht nur unerheblich, ist für diese Zeit eine angemessen herabgesetzte Miete geschuldet (§ 536 Abs. 1 BGB). Ob ein solcher Mangel vorliegt, prüfen wir. Vorschlag für eine Besichtigung: [Termin].'
    },
    {
      id: 'erhaltungspflicht', topic: 'erhaltung', label: 'Erhaltungspflicht des Vermieters',
      when: [/vermieter|mieter/i, /wohnung|mietsache/i, /zustand|instand|§ ?535|zu erhalten/i],
      forms: [
        form('Der Vermieter ist verpflichtet, die (?:Wohnung|Mietsache) in einem ', FIT_STATE, ' Zustand zu erhalten'),
        form('Der Vermieter muss die (?:Wohnung|Mietsache) in einem ', FIT_STATE, ' Zustand erhalten')
      ],
      foreign: [...TENANCY_FOREIGN, 'mieter'], numbers: [],
      rating: 'belegt', source: '§ 535 Abs. 1 BGB',
      reason: 'Der Vermieter hat die Mietsache in einem zum vertragsgemäßen Gebrauch geeigneten Zustand zu überlassen und zu erhalten.',
      reply: 'Der Vermieter hat die Mietsache während der Mietzeit in einem zum vertragsgemäßen Gebrauch geeigneten Zustand zu erhalten (§ 535 Abs. 1 BGB). Wir nehmen Ihre Meldung auf und prüfen sie. Vorschlag für eine Besichtigung: [Termin].'
    },

    /* ───── Mietrecht: Modernisierung ───── */
    {
      id: 'mod-ankuendigung-richtig', topic: 'mod-ankuendigung', label: 'Ankündigung der Modernisierung',
      when: [MODERNIZATION, /an(?:ge|zu)?k(?:ü|ue)ndig/i, /monat/i],
      forms: [form('(?:Eine|Die) Modernisierung(?:smaßnahme)? (?:muss|ist) (?:dem Mieter )?(?:spätestens |mindestens )?(?<n>', NUM, ') ', MONTHS, ' vor (?:ihrem )?Beginn (?:in Textform )?(?:angekündigt werden|anzukündigen)')],
      foreign: TENANCY_FOREIGN, numbers: [3], allow: [/sp(?:ä|ae)testens|mindestens/],
      slots: { n: 3 },
      wrong: {
        reason: 'Die Modernisierung ist nach § 555c Abs. 1 BGB spätestens drei Monate vor Beginn in Textform anzukündigen. Die genannte Frist weicht davon ab.',
        reply: 'Eine Modernisierungsmaßnahme ist spätestens drei Monate vor ihrem Beginn in Textform anzukündigen; Ausnahmen gelten bei nur unerheblichen Maßnahmen (§ 555c BGB).'
      },
      rating: 'belegt', source: '§ 555c Abs. 1 BGB',
      reason: 'Die Modernisierung ist spätestens drei Monate vor Beginn in Textform anzukündigen (Ausnahme: nur unerhebliche Einwirkung und Mieterhöhung).',
      reply: 'Eine Modernisierungsmaßnahme ist spätestens drei Monate vor ihrem Beginn in Textform anzukündigen; Ausnahmen gelten bei nur unerheblichen Maßnahmen (§ 555c BGB). Wir prüfen Datum und Inhalt der Ankündigung.'
    },
    {
      id: 'mod-zustimmung', topic: 'mod-zustimmung', label: 'Zustimmung zur Modernisierung', negation: true,
      when: [MODERNIZATION, /(?:ohne|nur mit)[^.]{0,20}(?:meine[r]?|unsere[r]?|die) (?:ausdr(?:ü|ue)ckliche[n]? )?(?:zustimmung|einwilligung)|(?:nicht|nie) zugestimmt|zustimmung[^.]{0,30}(?:erforderlich|notwendig|nötig)/i],
      unless: [/§ ?558|beschluss|eigent(?:ü|ue)mer|gemeinschaft|\bWEG\b/i],
      deny: /zustimmung[^.,]{0,20}(?:nicht|kein)[^.,]{0,10}(?:erforderlich|n(?:ö|oe)tig|notwendig)|keine[^.,]{0,25}zustimmung[^.,]{0,10}(?:erforderlich|n(?:ö|oe)tig|notwendig)|auch ohne|ohne (?:meine|die) zustimmung[^.]{0,60}\b(?<!nicht )(?:zul(?:ä|ae)ssig|m(?:ö|oe)glich|erlaubt|wirksam)\b/i,
      rating: 'fraglich', source: '§ 555d Abs. 1 BGB; § 559 Abs. 1 BGB',
      reason: 'Mieter haben Modernisierungsmaßnahmen grundsätzlich zu dulden (Ausnahme: Härte). Die Erhöhung nach § 559 setzt keine Zustimmung voraus.',
      reply: 'Modernisierungsmaßnahmen sind grundsätzlich zu dulden, soweit keine Härte vorliegt (§ 555d BGB). Die Mieterhöhung nach § 559 BGB setzt keine Zustimmung voraus; sie ist in Textform zu erklären und zu erläutern (§ 559b BGB).'
    },
    {
      id: 'mod-satz-richtig', topic: 'mod-satz', label: 'Höhe der Mieterhöhung nach Modernisierung',
      when: [RENT_INCREASE, /(?<![\d,.])\b(?:8|acht) ?(?:%|prozent)/i],
      forms: [form('Nach (?:einer|der) Modernisierung (?:darf|kann) die (?:jährliche Miete|Miete jährlich) um (?:8|acht) ?(?:%|Prozent) der (?:für die Wohnung )?(?:aufgewendeten )?Kosten erhöht werden')],
      foreign: TENANCY_FOREIGN, numbers: [8], allow: [/nach (?:einer|der) Modernisierung/],
      rating: 'belegt', source: '§ 559 Abs. 1 BGB',
      reason: 'Die jährliche Miete kann um 8 Prozent der für die Wohnung aufgewendeten Kosten erhöht werden (Grenzen und Sonderfälle: §§ 559, 559c, 559e BGB).',
      reply: 'Nach § 559 Abs. 1 BGB kann die jährliche Miete um 8 Prozent der für die Wohnung aufgewendeten Kosten erhöht werden; Kappungsgrenzen und Abzüge sind zu beachten. Die Berechnung erläutern wir Ihnen.'
    },
    {
      id: 'mod-satz-falsch', topic: 'mod-satz', label: 'Höhe der Mieterhöhung nach Modernisierung', negation: true,
      when: [MODERNIZATION, RENT_INCREASE, /(?<![\d,.])\b(?:11|elf) ?(?:%|prozent)/i],
      deny: /nicht (?:mehr )?(?:um )?(?:11|elf)|(?:11|elf) ?(?:%|prozent)[^.,]{0,40}(?:nicht|unzul(?:ä|ae)ssig)|fr(?:ü|ue)her|bisher/i,
      rating: 'fraglich', source: '§ 559 Abs. 1 BGB',
      reason: 'Der Satz in § 559 Abs. 1 BGB beträgt 8 Prozent, nicht 11 Prozent.',
      reply: 'Der gesetzliche Satz nach § 559 Abs. 1 BGB beträgt 8 Prozent der für die Wohnung aufgewendeten Kosten pro Jahr, nicht 11 Prozent.'
    },
    {
      id: 'mod-kappung-richtig', topic: 'mod-kappung', label: 'Kappungsgrenze nach Modernisierung',
      when: [/(?<![\d,.])\b(?:3|drei) ?(?:€|euro)/i, /quadratmeter|m²|qm/i, /(?:6|sechs) jahr/i],
      forms: [form('Nach (?:einer|der) Modernisierung darf die (?:monatliche )?Miete (?:innerhalb von|in) (?:6|sechs) Jahren (?:um )?höchstens (?:um )?(?:3|drei) ?(?:€|Euro) (?:je|pro) (?:Quadratmeter|m²|qm)(?: Wohnfläche)? (?:steigen|erhöht werden)')],
      foreign: TENANCY_FOREIGN, numbers: [6, 3], allow: [/nach (?:einer|der) Modernisierung/, /h(?:ö|oe)chstens/],
      rating: 'belegt', source: '§ 559 Abs. 3a BGB',
      reason: 'Innerhalb von sechs Jahren darf die monatliche Miete durch diese Erhöhungen um höchstens 3 Euro je Quadratmeter steigen (bei Mieten unter 7 Euro: 2 Euro; Sonderregel für Heizungen).',
      reply: 'Innerhalb von sechs Jahren darf die monatliche Miete durch Erhöhungen nach § 559 BGB um höchstens 3 Euro je Quadratmeter steigen, bei einer Ausgangsmiete unter 7 Euro um höchstens 2 Euro (§ 559 Abs. 3a BGB).'
    },
    {
      id: 'mod-erhaltungskosten', topic: 'mod-erhaltung', label: 'Erhaltungskosten bei der Modernisierung',
      when: [/(?:instandhaltung|instandsetzung|erhaltung)s?(?:kosten|anteil|ma(?:ß|ss)nahmen)/i, /modernisier|§ ?559/i],
      forms: [form('Bei (?:der|einer) Modernisierung(?:sumlage|smieterhöhung)? (?:müssen|sind) (?:die )?(?:Instandhaltungs|Instandsetzungs|Erhaltungs)kosten (?:abgezogen werden|abzuziehen)')],
      foreign: TENANCY_FOREIGN, numbers: [],
      rating: 'belegt', source: '§ 559 Abs. 2 BGB',
      reason: 'Kosten, die für Erhaltungsmaßnahmen erforderlich gewesen wären, gehören nicht zu den aufgewendeten Kosten.',
      reply: 'Kosten, die für Erhaltungsmaßnahmen erforderlich gewesen wären, zählen nicht zu den umlagefähigen Kosten (§ 559 Abs. 2 BGB). Den Abzug erläutern wir in der Berechnung.'
    },
    {
      id: 'mod-sonderkuendigung', topic: 'mod-kuendigung', label: 'Sonderkündigungsrecht bei Mieterhöhung',
      when: [/sonderk(?:ü|ue)ndig|au(?:ß|ss)erordentlich[^.]{0,20}k(?:ü|ue)ndig/i],
      forms: [form('(?:Bei|Nach) einer Mieterhöhung (?:nach § 55[89](?: BGB)?|nach (?:einer )?Modernisierung|bis zur ortsüblichen Vergleichsmiete) (?:steht (?:mir|dem Mieter) ein Sonderkündigungsrecht zu|(?:habe ich|hat der Mieter) ein Sonderkündigungsrecht)')],
      foreign: [...TENANCY_FOREIGN, 'vermieter'], numbers: [],
      allow: [/^nach einer Mieterh(?:ö|oe)hung/, /nach § 55[89](?: BGB)?/, /nach (?:einer )?Modernisierung/],
      rating: 'belegt', source: '§ 561 Abs. 1 BGB',
      reason: 'Bei einer Mieterhöhung nach § 558 oder § 559 kann der Mieter bis zum Ablauf des zweiten Monats nach Zugang zum Ablauf des übernächsten Monats kündigen.',
      reply: 'Bei einer Mieterhöhung nach § 558 oder § 559 BGB besteht ein Sonderkündigungsrecht: Kündigung bis zum Ablauf des zweiten Monats nach Zugang der Erklärung zum Ablauf des übernächsten Monats (§ 561 Abs. 1 BGB).'
    }
  ];

  // Zitierte Urteile: nie bewerten, immer prüfen lassen (typisch: erfundene Aktenzeichen).
  const CASE_LAW = /\b(?:BGH|BVerfG|OLG|LG|AG)\b[^.!?]{0,80}(?:Urt(?:eil|\.)|Beschluss vom|Az\.|Aktenzeichen|\d{1,4}\/\d{2,4})|\b(?:V|VIII|XII) ?ZR ?\d{1,4}\/\d{2}|\bUrteil(?:e)? des (?:BGH|Bundesgerichtshofs?|Landgerichts?|Amtsgerichts?|Oberlandesgerichts?)/;
  // Sätze mit Rechtsbezug, für die keine Regel passt: als "unklar" listen statt verschweigen.
  const LEGAL_SIGNAL = /§|\b(?:WEG|BGB|BetrKV|HeizkostenV|HeizKV)\b|gesetzlich|laut gesetz|nach dem gesetz|rechtswidrig|rechtlich|unzul(?:ä|ae)ssig|unwirksam|ung(?:ü|ue)ltig|\bnichtig|anspruch|berechtigt|verpflichtet|rechtsanspruch|\b(?:mein|das|ein|unser) recht\b|recht auf|haft(?:et|en|bar|ung)|schadens?ersatz|verj(?:ä|ae)hr|verfristet|frist ?(?:von|abgelaufen)|rechtsprechung|ausgeschlossen|(?:ohne|keine[nm]?) (?:einen )?(?:beschluss|zustimmung|genehmigung)|nachforderung|nachzahlung|\bf(?:ä|ae)llig|mietminderung|miete[^.]{0,40}minder|an(?:zu)?fecht|angefochten|(?:innerhalb|binnen|fr(?:ü|ue)hestens|sp(?:ä|ae)testens|h(?:ö|oe)chstens)[^.]{0,30}(?:tage?n?\b|wochen?\b|monat|jahr)|einsicht|sonderk(?:ü|ue)ndig|\bverlangen\b|instand ?(?:zu )?(?:halten|setzen)|miete[^.]{0,60}(?:erh(?:ö|oe)h|minder)/i;

  return Object.freeze({ version: '2026-11-28', RULES: Object.freeze(RULES), CASE_LAW, LEGAL_SIGNAL });
}));
