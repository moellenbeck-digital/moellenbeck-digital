# Möllenbeck-Digital — Design-System

> Kanonische URL: <https://moellenbeck-digital.io/DESIGN.md>
> — z. B. `curl -s https://moellenbeck-digital.io/DESIGN.md` als Design-Kontext in andere Projekte laden.

Referenz-Styleguide für alle Produkte und Web-Auftritte von Möllenbeck-Digital.
Quelle der Wahrheit ist die Website (`style.css` in diesem Repo); dieses Dokument
destilliert daraus wiederverwendbare Regeln, Tokens und Muster.

**Charakter in einem Satz:** Dunkles, technisches "Terminal-Ästhetik trifft
Editorial-Design" — ruhiger Dark-Mode-Hintergrund, ein einziger warmer
Orange-Akzent, Monospace-Details mit Code-Anmutung (`>`, `//`, `->`) und eine
markante Display-Schrift für Headlines.

---

## 1. Farben

Alle Farben als CSS Custom Properties definieren. Kein Produkt weicht von
diesen Tokens ab — neue Bedeutungen bekommen neue Tokens, keine Hex-Werte
im Komponenten-Code.

```css
:root {
  /* Flächen (von tief nach erhaben) */
  --bg:          #08080a;   /* Seitenhintergrund */
  --bg-elevated: #111114;   /* Cards, Sections, Panels */
  --bg-card:     #16161a;   /* nochmals erhaben: Avatare, Inputs, Nested */

  /* Text */
  --text:        #e8e8ed;   /* Primärtext */
  --text-muted:  #6b6b76;   /* Sekundärtext, Labels, Fließtext in Cards */

  /* Akzent — Soft Orange (Tailwind orange-400) */
  --accent:      #fb923c;
  --accent-dim:  rgba(251, 146, 60, 0.10);  /* Tag-/Badge-Hintergründe */
  --accent-glow: rgba(251, 146, 60, 0.28);  /* Glows, Schatten, Radial-Gradients */

  /* Linien */
  --border:      #222228;   /* 1px-Rahmen und Trennlinien */
}
```

### Regeln

- **Ein Akzent, sparsam eingesetzt.** Orange markiert Interaktion, Marker,
  Nummern, Status — nie große Flächen. Die Seite bleibt zu ~95 % Graustufen.
- **Hierarchie über Flächenhelligkeit:** `--bg` → `--bg-elevated` → `--bg-card`.
  Keine Schatten zur Tiefenstaffelung (Ausnahme: Mobile-Dropdown, Hover-Glow).
- **Akzent-Transparenzen** immer aus dem Basiswert `251, 146, 60` ableiten:
  `0.10` für Füllungen, `0.15–0.35` für Rahmen, `0.28` für Glows.
- Text auf Akzentflächen (z. B. Primär-Button): `--bg`, nicht Weiß.
- Es gibt **keinen Light Mode**. Produkte sind dark-only.

## 2. Typografie

Drei Schriften mit klar getrennten Rollen:

```css
--display: 'Syne', sans-serif;                                  /* Headlines */
--sans:    'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; /* Fließtext */
--mono:    'DM Mono', 'Fira Code', monospace;                   /* UI-Details */
```

Google-Fonts-Import (Gewichte genau so laden):

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@400;500;600&family=Syne:wght@400;600;700;800&display=swap');
```

| Rolle | Schrift | Gewicht | Größe | Besonderheit |
|---|---|---|---|---|
| H1 / Hero | Syne | 800 | `clamp(2rem, 8vw, 4.5rem)` | `letter-spacing: -0.03em`, `line-height: 1.05` |
| H2 / Section | Syne | 800 | `clamp(1.75rem, 4vw, 2.5rem)` | `letter-spacing: -0.02em` |
| H3 / Card-Titel | Syne | 700 | `1.1rem` | `letter-spacing: -0.01em` |
| Fließtext | Inter | 400 | `0.85–1.05rem` | `line-height: 1.6` |
| Labels, Nav, Tags, Buttons | DM Mono | 400–500 | `0.7–0.85rem` | `letter-spacing: 0.04–0.15em`, oft `uppercase` |

### Regeln

- **Syne nur für Überschriften**, nie für Fließtext oder UI-Elemente.
- **DM Mono für alles "Technische":** Navigation, Buttons, Badges, Nummern,
  Status, Meta-Angaben, Links. Mono-Text bekommt immer positives
  Letter-Spacing; Display-Text immer negatives.
- Headlines dürfen ein Wort/eine Zeile in `--accent` hervorheben
  (auf eigener Zeile via `display: block`).
- Basis: `html { font-size: 16px }`, Body `line-height: 1.6`.

## 3. Signatur-Motive (Wiedererkennung)

Diese Details machen den Look aus — mindestens zwei davon sollte jedes
Produkt tragen:

1. **Prompt-Zeichen `>`** als Aufzählungs- und Nav-Präfix (via `::before`,
   in `--accent`, Listen-Items mit `padding-left: 1.2rem`).
2. **Kommentar-Präfix `//`** vor Untertiteln/Subline (in `--border`-Farbe).
3. **ASCII-Pfeile `->` und `<-`** für weiterführende Links bzw. Zurück-Links —
   keine Icon-Fonts, keine SVG-Pfeile.
4. **Punktraster-Hintergrund** auf dem Body:
   ```css
   background-image: radial-gradient(circle at 1px 1px, rgba(251,146,60,0.04) 1px, transparent 0);
   background-size: 32px 32px;
   ```
5. **Blinkender Cursor** (2px breiter `--accent`-Balken, `blink 1s step-end infinite`)
   am Ende von Hero-Headlines.
6. **Akzent-Balken links:** 3px breiter `--accent`-Streifen an der linken
   Kante von Cards/Sections, unsichtbar bis Hover (`opacity` 0 → 1).
7. **Glow-Radial:** großer `radial-gradient(circle, var(--accent-glow), transparent)`
   mit niedriger Opacity (0.15–0.3) hinter Hero/CTA-Bereichen, gern mit
   langsamer `pulse`-Animation.
8. **Status-Punkt:** 6px-Kreis in `--accent` mit `box-shadow: 0 0 8px var(--accent-glow)`
   für "aktiv"; grau (`--text-muted`) ohne Glow für "archiviert/inaktiv".

## 4. Form & Abstände

- **Radii:** `4px` Standard (Cards, Buttons, Panels), `2px` für kleine
  Chips/Tags. Nichts darüber — keine Pills, keine großen Rundungen.
- **Rahmen:** immer `1px solid var(--border)`.
- **Layoutbreiten:** Content-Blöcke `max-width: 1080px`, Text-/Leseseiten
  und Hero `max-width: 720px`, jeweils zentriert.
- **Seiten-Padding:** `2rem` horizontal (Desktop), `1.25rem` mobil.
- **Vertikaler Rhythmus:** Sections `4rem` Padding oben/unten (mobil `3rem`),
  Card-Innenabstand `1.5rem` (mobil `1.25rem`), Grid-Gap `1.25rem`.
- **Grids:** `repeat(auto-fit, minmax(320px, 1fr))` für 2-spaltig,
  `minmax(280px, 1fr)` für 3-spaltig; zwischen 601–880px einspaltig.
- `scroll-margin-top: 5rem` auf Anker-Zielen (fixe Nav).

## 5. Komponenten-Rezepte

### Navigation
Fixiert, `rgba(8,8,10,0.85)` mit `backdrop-filter: blur(12px)`,
`1px` Border unten. Links in DM Mono `0.75rem`, `--text-muted`, mit
`>`-Präfix; Hover färbt Link und Präfix `--accent`. Mobil (< 600px):
Hamburger als `<details>/<summary>`, drei 20×2px-Balken in `--accent`
auf `--accent-dim`-Fläche, Menü als abgedunkeltes Blur-Dropdown rechts.

### Primär-Button
```css
font-family: var(--mono); font-size: 0.85rem; font-weight: 500;
text-transform: uppercase; letter-spacing: 0.05em;
color: var(--bg); background: var(--accent);
border: 1px solid var(--accent); border-radius: 4px;
padding: 0.75rem 1.25rem;
```
Hover: `translateY(-2px)` + `box-shadow: 0 6px 24px var(--accent-glow)`.
Focus: `outline: 2px solid var(--accent); outline-offset: 3px`.

### Sekundär-Link (Ghost)
DM Mono, `--text-muted`, keine Border; Hover: Text `--accent` +
`border-bottom: 1px solid var(--accent)`. Weiterführende Links hängen
`->` via `::after` an.

### Tag / Badge
DM Mono `0.7rem`, uppercase, `letter-spacing: 0.1em`, Farbe `--accent`,
Hintergrund `--accent-dim`, `1px` Rahmen `rgba(251,146,60,0.15)`,
`border-radius: 2px`, Padding `0.3rem 0.75rem`.

### Tech-/Stack-Chip (neutral)
Wie Tag, aber `--text-muted` auf transparentem Grund mit `--border`-Rahmen —
für Metadaten ohne Gewicht.

### Card
`--bg-elevated`, `1px --border`, `4px` Radius. Hover: Rahmen
`rgba(251,146,60,0.25)`, `translateY(-2px)`, linker 3px-Akzentbalken
blendet ein. Aufbau: Mono-Nummer/Marker (`01`, `02` …) → Syne-H3 →
muted Fließtext → optional `>`-Liste → Chips unten (`margin-top: auto`).

### Section-Header
Zeile aus: Mono-Marker (z. B. `01`, uppercase, `--accent`) + Syne-H2 +
1px-Linie in `--border`, die den Rest der Zeile füllt (mobil entfällt
die Linie).

### CTA- / Kontakt-Panel
Zentrierte Card mit großem Glow-Radial hinter dem Inhalt
(`opacity: 0.15`), Mono-Marker, Syne-H2, E-Mail-Link in DM Mono
`--accent` mit Border-Bottom-Hover.

## 6. Motion

Zurückhaltend, immer `ease-out`, kurz:

| Zweck | Animation |
|---|---|
| Einstieg von oben (Nav) | `fadeDown 0.6s` (10px) |
| Einstieg von unten (Inhalte) | `fadeUp 0.5–0.6s` (16px), gestaffelt mit Delays `0.2s / 0.35s / 0.5s / …` (~0.15s Schritte) |
| Scroll-Reveal | `.reveal`: `opacity 0 → 1`, `translateY(20px → 0)`, `0.6s ease-out` — **nur bei `.js` auf `<html>`**, damit Inhalte ohne JS sichtbar bleiben |
| Hover | `0.2–0.3s ease`, nur `color`, `border-color`, `opacity`, `transform: translateY(-2px)` |
| Glow-Puls | `pulse 4s ease-in-out infinite alternate` (Opacity 0.2 ↔ 0.4, Scale 0.95 ↔ 1.05) |
| Cursor | `blink 1s step-end infinite` |

Keine Bounce-Effekte, keine Rotationen, keine Parallax-Spielereien.

## 7. Grundgerüst pro Produkt

Jedes neue Produkt startet mit diesem Fundament:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

html { font-size: 16px; scroll-behavior: smooth; overflow-x: clip; }

body {
  font-family: var(--sans);
  color: var(--text);
  background-color: var(--bg);
  line-height: 1.6;
  min-height: 100vh;
  overflow-x: hidden;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(251, 146, 60, 0.04) 1px, transparent 0);
  background-size: 32px 32px;
}
```

Für Tailwind-Projekte die Tokens aus Abschnitt 1 als Theme-Variablen
übernehmen (`--accent` ≙ `orange-400`); die Signatur-Motive (Abschnitt 3)
als Utility-Klassen oder Komponenten nachbauen.

## 8. Logo & Assets

- Logos liegen in `assets/`: `md_variante1.svg` (Nav/Header, Höhe 28px),
  `md_variante2.svg` (Alternative), `md_favicon.svg` + PNG-Favicons.
- Avatare/Monogramme: 48×48px, `4px` Radius, `--bg-card`-Fläche,
  `--border`-Rahmen, Initialen in DM Mono 700 `--accent`.
- OG-Image-Stil: siehe `og-banner.html` — gleiche Tokens, Punktraster, Glow.

## 9. Do & Don't

**Do**
- Dark-only, ein Orange-Akzent, viel Grau-Raum.
- Mono für alles Technische, Syne nur für Headlines.
- ASCII statt Icons (`>`, `//`, `->`, `<-`).
- Hover-Feedback über Farbe/Border/2px-Lift.
- Semantisches HTML, funktionsfähig ohne JavaScript.

**Don't**
- Keine zweite Akzentfarbe, keine Verläufe als Flächenfüllung.
- Keine Radien > 4px, keine Pills, keine weichen Schatten-Stapel.
- Kein Syne im Fließtext, kein Mono für lange Absätze.
- Keine Icon-Bibliotheken für Pfeile/Bullets, wo ASCII reicht.
- Kein reines Weiß (`#fff`) und kein reines Schwarz (`#000`).
