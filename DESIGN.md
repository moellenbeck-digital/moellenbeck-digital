# Moellenbeck-Digital — Design-System

Designstand: 27. November 2026. Abgeleitet aus der aktuellen Website, einschließlich Avatar und Agenten-Szenen. Dieser Stand ersetzt die frühere Vorgabe mit 4-px-Karten und extern geladenen Google Fonts.

- Visuelle Referenz: [design.html](https://moellenbeck-digital.io/design.html)
- Regeln für Agenten: [DESIGN.md](https://moellenbeck-digital.io/DESIGN.md)
- Wiederverwendbare Tokens und Komponenten: [assets/design-system.css](https://moellenbeck-digital.io/assets/design-system.css)
- Website-Komposition: `style.css`, `index.html`; Verhalten: `main.js`

**Charakter:** dunkle, großzügige Flächen; warme orange Aktionen; prägnante Space-Grotesk-Überschriften; lesbarer Inter-Fließtext; technische Details in DM Mono. Der freundliche Roboter macht Agenten sichtbar. Die Entscheidung des Menschen bleibt im Inhalt erkennbar.

## Schnellstart für Websites, Apps und Agenten

1. Diese Datei als Designkontext verwenden; `design.html` zeigt die tatsächlichen Komponenten.
2. `assets/design-system.css`, den Ordner `assets/fonts/` einschließlich Lizenzdateien und die benötigten Bilder kopieren. Relative Pfade erhalten. Kein Build-Tool und kein Framework erforderlich.
3. CSS laden und `md-ui` auf den Body oder einen abgegrenzten App-Bereich setzen. Die CSS-Datei definiert globale `:root`-Tokens und Font-Familien; Komponentenstile sind über Klassen adressiert. Bei Integration in eine bestehende App Token-Namen auf Kollisionen prüfen oder einen iframe verwenden.
4. Für eine ganze Website passende Abschnitte aus `index.html` und `style.css` übernehmen. Die kleine Komponentenbasis allein enthält weder Filmsteuerung noch Kontaktformular-Logik.

```html
<link rel="stylesheet" href="assets/design-system.css">
<section class="md-ui" aria-label="Agenten-Assistent">
  <article class="md-card">
    <img class="md-avatar" src="assets/img/avatar-200.webp"
         width="200" height="261" alt="MD-Agent">
    <h2>Wie können wir helfen?</h2>
    <p>Beschreiben Sie die Aufgabe. Wir bereiten den nächsten Schritt vor.</p>
    <a class="md-button" href="mailto:admin@moellenbeck-digital.io">Kontakt aufnehmen</a>
  </article>
</section>
```

Für React/Vue die gleichen semantischen Elemente und Klassen verwenden. Links navigieren, Buttons führen Aktionen aus. Statusinformationen gehören zusätzlich in Text. Das Design ist auf dunkle Flächen ausgelegt; ein helles Theme ist nicht definiert.

## Farben

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#08080a` | Seitenhintergrund |
| `--bg-elevated` | `#111114` | Karten, Panels |
| `--bg-card` | `#16161a` | Eingabefelder, innere Flächen |
| `--text` | `#e8e8ed` | Überschriften, Haupttext |
| `--text-2` | `#a1a1aa` | Fließtext auf dunklen Flächen |
| `--text-3` | `#8b8b96` | Metadaten, sekundäre Labels |
| `--text-muted` | `#6b6b76` | Nur Dekoration, nicht lesbarer Text |
| `--accent` | `#fb923c` | Primäre Aktion, Links, Fokus |
| `--accent-dim` | `rgba(251,146,60,.10)` | Dezente Akzentflächen |
| `--accent-glow` | `rgba(251,146,60,.28)` | Dekoratives Licht |
| `--control-border` | `#71717c` | Erkennbare Umrisse von Eingabefeldern |
| `--border` / `--line` | `#222228` | Dekorative Trennung |
| `--line-2` | `#2c2c33` | Stärkere Trennlinien |

Orange Buttons erhalten dunklen Text (`--bg`). Helle Schrift auf Orange ist nicht vorgesehen. `--border` ist kein hinreichend deutlicher alleiniger Umriss eines Eingabefeldes: für erkennbare Bedienelemente Text, Flächen und `--control-border` als Rahmen einsetzen.

Blau (`--c-blue: 96,165,250`) und Violett (`--c-violet: 167,139,250`) sind dekoratives Hintergrundlicht. Einzelne Bots und Produktdiagramme haben eigene Farben. Grün (`--ok: #34d399`, `--ok-text: #6ee7b7`, `--ok-ink: #052e1c`) kennzeichnet Freigaben in Agenten-Szenen, immer zusammen mit einem Haken oder Text. Es ist keine zweite allgemeine CTA-Farbe.

## Typografie

| Rolle | Familie / Gewicht | Größe / Verhalten |
|---|---|---|
| Hero | Space Grotesk / 700 | `clamp(3rem, 5.6vw, 6rem)` auf großem Desktop; mobil kleiner |
| Abschnitt | Space Grotesk / 700 | 32–96 px nach Hierarchie; FAQs 32–56 px |
| Komponententitel | Space Grotesk / 500–700 | 18–24 px |
| Lesetext | Inter / 400–600 | 16–18 px, Zeilenhöhe 1,6–1,75 |
| Navigation, Aktion, Metadaten | DM Mono / 400–500 | 12–14 px, Zeilenhöhe mindestens 1,4 |

Überschriften mit enger Laufweite (−0,02 bis −0,045 em); lesbarer Text ohne künstliches Tracking. Mono ist für kurze Informationen gedacht. Versalien bleiben kurzen bestehenden Navigationslabels vorbehalten, nicht Absätzen oder langen Buttons.

Lesebreite etwa 60–68 Zeichen, höchstens rund 80. In kleinen Metadaten unter 14 px muss der Kontrast besonders klar sein. Lange Wörter, E-Mail-Adressen und Code dürfen bei schmalen Viewports umbrechen.

### Lokale Schriften

Keine externen Font-Requests. Die CSS-Datei lädt diese Dateien relativ zu ihrem eigenen Speicherort:

- [Inter variable](https://moellenbeck-digital.io/assets/fonts/inter-var.woff2), Gewichte 400–600
- [Space Grotesk variable](https://moellenbeck-digital.io/assets/fonts/space-grotesk-var.woff2), Gewichte 400–700
- [DM Mono 400](https://moellenbeck-digital.io/assets/fonts/dm-mono-400.woff2)
- [DM Mono 500](https://moellenbeck-digital.io/assets/fonts/dm-mono-500.woff2)
- Lizenzen: [Inter](https://moellenbeck-digital.io/assets/fonts/OFL-Inter.txt), [Space Grotesk](https://moellenbeck-digital.io/assets/fonts/OFL-SpaceGrotesk.txt), [DM Mono](https://moellenbeck-digital.io/assets/fonts/OFL-DMMono.txt) (SIL OFL 1.1)

Fallbacks: Inter → system-ui; Space Grotesk → sans-serif; DM Mono → Fira Code → monospace. Die vorhandenen Dateien sind Latin-Subsets; weitere Schriftsysteme benötigen passende Fonts.

## Layout und Form

- `--wrap: 1200px`, `--pad: clamp(20px, 4vw, 48px)`.
- Karten: `--r-card: 16px`; Buttons und Felder: `--r-ctl: 10px`; kleine Statusmarken: 6 px. Die Navigation verwendet 14 px, Figuren/Sprechblasen dürfen organische Rundungen haben.
- Abstände innerhalb von Komponenten: 8, 12, 16, 24, 32 px. Karten-Innenabstand 20–32 px.
- Website-Abschnitte sind großzügig. Die FAQ nutzen 80–144 px vertikalen Abstand. Apps brauchen kompaktere Abstände, keine filmartigen Leerflächen zwischen Arbeitsbereichen.
- Mobile Navigation und FAQ wechseln bei 760 px. Andere Grids dürfen früher umbrechen, wenn der Inhalt Platz braucht. Nie feste Mindestbreiten größer als der mobile Inhaltsbereich.
- Dunkle Flächen unterscheiden Ebenen; ein heller Fokus zeigt Bedienung. Glows bleiben Dekoration und dürfen Text nicht beeinträchtigen.
- `//`, `MD_` und kurze technische Bezeichnungen stiften Wiedererkennung. Keine dekorativen Nummern an Inhalten ohne Reihenfolge.

## Komponenten

### Aktionen und Karten

`md-card`: erhöhte Fläche, 1-px-Trennrahmen, 16-px-Radius. Eine nicht klickbare Karte braucht keinen Hover-Lift.

`md-button`: orange Hauptaktion mit dunklem Text, mindestens 44 px hoch. `md-button md-button--secondary`: ruhige Alternative mit erkennbarem Rahmen. Texte benennen die Folge, beispielsweise „Nachricht vorbereiten“ oder „Design übernehmen“. Keine vorgetäuschten Aktionen im Styleguide.

`md-status`: kurzer Status als Text. Farbe unterstützt die Bedeutung, trägt sie aber nie allein.

### FAQ

Native `<details>` / `<summary>` mit Klassen `faq-item` / `faq-answer`; Gruppe in `faq-list`. Erste Antwort offen, mehrere dürfen offen bleiben. Funktioniert ohne JavaScript, per Enter/Leertaste und mit nativer Zustandsmeldung für assistive Technik. Keine zusätzlichen `role="button"` oder manuell gepflegten `aria-expanded`-Attribute nötig.

```html
<div class="faq-list">
  <details class="faq-item" open>
    <summary>Wer entscheidet?</summary>
    <div class="faq-answer"><p>Ein Mensch prüft und gibt frei.</p></div>
  </details>
</div>
```

Auf Inhaltsseiten: Einleitung links, Fragen rechts; mobil untereinander. Antworten maximal 68ch breit. Der sichtbare Text und das FAQ-JSON-LD müssen dieselben Aussagen enthalten. Inhalte bleiben im HTML, auch wenn Antworten geschlossen sind.

### Navigation und Einstellungen

Wesentliche Ziele im Header; FAQ und Designressourcen zusätzlich im Footer. Mobile Menü- und Hauptaktionsflächen mindestens 44 × 44 px. Escape schließt das mobile Menü und setzt den Fokus zurück auf den Menüschalter.

Der Lautsprecher bedeutet **optionale Klicktöne**, nicht Filmton. Er sitzt mit sichtbarem Label „Klicktöne: aus/an“ und Erklärung im Footer. Standard: aus; Einstellung lokal unter `md-sounds`. `aria-pressed` gibt den Zustand wieder, der zugängliche Name „Klicktöne“ bleibt stabil. Ohne JavaScript wird die Einstellung nicht eingeblendet. Filmton wird am Film selbst bedient.

### Formulare

Name und E-Mail stehen jeweils in einer eigenen Zeile über die volle Formularbreite, damit auch längere Eingaben Platz haben. Sichtbare Labels; verständliche Fehlermeldungen mit Zuordnung zum Feld. Das Kontaktformular bereitet eine E-Mail im lokalen Mailprogramm vor; die Beschriftung darf keinen bereits erfolgten Versand behaupten. Keine Produktlogik allein durch Übernahme der visuellen CSS-Klassen erwarten.

## Avatar und Bewegung

Originale verwenden; Proportionen beibehalten. Die Figur nicht strecken oder in einen quadratischen Ausschnitt zwingen. Für quadratische App-Profile die dafür vorhandene PNG-Datei verwenden.

| Asset | Maße | Einsatz |
|---|---|---|
| [avatar-200.webp](https://moellenbeck-digital.io/assets/img/avatar-200.webp) | 200 × 261 | Freigestellte Figur; kompakte Begleitung |
| [roboter.webp](https://moellenbeck-digital.io/assets/img/roboter.webp) | 760 × 760 | Hero / große Illustration |
| [roboter.png](https://moellenbeck-digital.io/assets/img/roboter.png) | 760 × 760 | PNG-Alternative |
| [github-avatar.png](https://moellenbeck-digital.io/assets/github-avatar.png) | 460 × 460 | Quadratisches Profil für Apps und Agenten |
| [md_variante1.svg](https://moellenbeck-digital.io/assets/md_variante1.svg) | viewBox 400 × 120 | Wortmarke, gewöhnlich 26–28 px hoch |
| [md_variante2.svg](https://moellenbeck-digital.io/assets/md_variante2.svg) | siehe SVG | Alternative |
| [md_favicon.svg](https://moellenbeck-digital.io/assets/md_favicon.svg) | siehe SVG | App-Zeichen / Favicon |

Die SVG-Wortmarke enthält Text mit Monospace-Fallbacks, keine fest in Pfade umgewandelten Buchstaben. Für pixelidentische Darstellung über Plattformen wäre ein separat freigegebenes Pfad-Logo nötig.

**Statische Einbettung ist der Standard.** `md-avatar` setzt eine Breite von 112 px und erhält das Seitenverhältnis. Bei informativer Verwendung ein kurzes `alt`; bei reiner Dekoration `alt=""`. Einen Agenten als Agent kennzeichnen, nicht als reale Person.

### Bestehende Website-Animationen

`assets/agents.js` und `assets/agents.css` bilden ein eigenes Modul. Das Skript zerlegt die Originalbilder in Canvas-Ebenen; die Geometrie ist auf die natürlichen Breiten 760 und 200 px abgestimmt. Nicht einfach ein anderes Bild unter demselben Namen einsetzen. Host-Markup und reservierte Abmessungen sind in `index.html` dokumentiert; Bilder bleiben als Fallback vorhanden. Beim Übernehmen der Animation das ganze Modul und die zugehörige Struktur übernehmen, nicht nur das Bild.

- Bewegung über `transform` und `opacity`; Avatar darf schweben, blinzeln, den Kopf neigen und kurz winken.
- Ein sichtbarer seitenweiter Pauseknopf mit mindestens 44-px-Ziel hält Figuren an. Kein neues Bewegungssystem ohne Pausensteuerung.
- `prefers-reduced-motion`, unsichtbarer Tab, außerhalb des Viewports: Figuren ruhen. Ohne JavaScript bleibt ein statisches Bild.
- Bewegte Elemente verdecken keinen Text und keine Personen. Inhalt wird nie allein durch Animation verständlich.
- `assets/motion.css` / `assets/motion.js`: einmalige Mikro-Szenen unter fünf Sekunden; keine Schleifen oder Hover-Replays. Pause setzt sie auf das Endbild.
- Freigabe-Grün nur für Freigaben; LED-, Haut- und Dokumentfarben bleiben lokal in den Szenen (`--led*`, `--human-*`, `--doc-bg`).

Bestehende Mikro-Szenen: Fähigkeiten (Linien-Diagramme), Terminal (Freigabehinweis), Organisation (Aufgaben / Prüfhaken), MD_Process (Prozess bis Mensch), BloomMD (Mindmap), wave-mesh (gleichzeitige direkte Verbindungen), HV-Ablauf (vier Stationen), HV-Vorteile (Linienzeichen), HV-Pilot (Mensch gibt frei). Höchstens ein Avatar-Begleiter pro Seite, erst ab 1024 px. Szenentexte mindestens 11 px; bei Platzmangel Dekoration weglassen.

## Zugänglichkeit und Prüfung

- Lesetext auf seiner tatsächlichen Fläche prüfen; Ziel mindestens 4,5:1 für normalen Text, 3:1 für große Schrift. Dekorative Linien sind keine garantierten Kontrollumrisse.
- Sichtbarer Fokus, semantische Landmarken, ein H1, logische Überschriftenfolge, Skip-Link.
- Tastatur prüfen: Menü, Links, FAQ, Formular und Mediaplayer. Automatische Scans ersetzen keine Screenreader-Prüfung.
- 320 px, 375 px, Tablet und Desktop prüfen; bei 200 % Zoom bleiben Inhalte und Aktionen erreichbar.
- Ohne JavaScript: Kerninhalte, Kontaktlink, FAQs und statische Bilder erreichbar.
- Keine Sounds ohne aktivierte Einstellung. Filmton hat eine eigene Steuerung.

## Pflege

`assets/design-system.css` ist die gemeinsame Quelle für Tokens und FAQ-Komponenten. `style.css` importiert sie. Die Hausverwaltungsseite bleibt als eigener Web-Root nutzbar und führt deshalb eine byteidentische Kopie unter `hausverwaltung/assets/design-system.css`; CI prüft die Übereinstimmung.

Bei Designänderungen CSS, diesen Text und `design.html` gemeinsam aktualisieren. `DESIGN.md`, `design.html` und CSS sind in der Pages-Allowlist öffentlich freigegeben. Die Legacy-Jekyll-Konfiguration schließt `.md` aus der Markdown-Konvertierung aus, damit dieses Dokument unter seiner Original-URL abrufbar bleibt. Die übrigen internen Markdown-Dateien bleiben ausgeschlossen.
