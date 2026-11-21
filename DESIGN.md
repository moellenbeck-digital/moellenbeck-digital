# DESIGN.md — Moellenbeck-Digital 2026 (Phase 2)

## Ziel

Statische Seite mit den Prinzipien von x.ai, umgesetzt in MD-Farben. Die Prinzipien sind übernommen, nicht kopiert. Referenz-Screenshots von x.ai (21.11.2026, Playwright): `~/.openclaw/workspace/media/web-ref/relaunch-p2/ref/`.

Übernommen von x.ai: zentrale Ankündigungs-Pill über der Headline, sehr große ruhige Headlines, wenig Text, Pill-Buttons, Bento-Kacheln für Produkte, viel Leerraum, feine 1-px-Linien, Projektliste in Zeilen, großer Footer mit Spalten.

## Prinzipien

1. **Tiefschwarz, Licht gestaltet.** Basis `#08080a`. Weiche Lichter in Orange, Blau und Violett (aus v6) als radial-gradient, ohne `filter: blur`. Das spart Performance. Grain als statische SVG-Kachel, feine Spaltenlinien im Hero.
2. **Hero ohne Karte.** Riesige Headline (Space Grotesk, bis 6,4 rem), ein CTA, eine Textzeile. Der 3D-MD-Roboter ist der Avatar: groß, schwebt (CSS-Float), Parallax beim Scrollen und mit dem Zeiger.
3. **Film als Bühne.** Das v6-Video (`md-agenten-v6-en.mp4`) ist das einzige Video. Die Sektion ist sticky (210 vh Strecke), das Video blendet ein und wächst von 62 % auf 100 %. Die Ränder laufen über `mask-image` in den Hintergrund aus. Dahinter liegt ein Glow.
4. **Eigener Player.** Glas-Pill „Mit Ton ansehen“, danach Pause/Weiter und eine Ton-Pill, Zeitangabe, dünne orange Fortschrittslinie. Kein Browser-Chrome.
5. **Ton.** Die Vorschau (`v6-preview.mp4`, 12 s) läuft stumm in Schleife, nur wenn sie sichtbar ist. Ein Klick lädt `v6-main.mp4` (48 s) und spielt mit Ton. UI-Sounds (WebAudio-Klick) sind optional über den Schalter in der Nav, standardmäßig aus.
6. **Fähigkeiten.** Vier große Kacheln mit den 2D-Agenten-Bots aus v6 (Stills, `assets/img/bots/`). Ein Hover-Glow folgt dem Zeiger und nimmt die Farbe des Bots an.
7. **Plattform als Bento (Phase 3).** Leitsatz „Agents prepare. Humans decide.“ Jedes Produkt: ein Satz, ein Visual in Bot-/Karten-/Glow-Sprache (SVG/HTML, keine Screenshots), ein Link. HV nur als „Bald“ + Warteliste (mailto), keine Preise. Anipal nur als Referenz. SitePilot bewusst nicht (Frage an Max). Früher: **Showcases als Bento.** MD-Agenten und KI-Mitarbeiter Hausverwaltung als große Medien-Kacheln (Stills aus v6), Anipal, BloomMD und wave-mesh als Typo-Kacheln. Darunter „Weitere Projekte“ als Zeilenliste.
8. **Motion.** Fade-up und Blur-in, Zeitkurve `cubic-bezier(.22,1,.36,1)`. Bei `prefers-reduced-motion` gibt es keine Animation, kein Autoplay und keine Sticky-Strecke.
9. **Nav.** Minimal, sticky, wird beim Scrollen zur Glas-Pill.
10. **Footer.** Groß: Spalten plus ein riesiges `MD_`-Wordmark mit Orange-Verlauf.

## Tokens (`style.css :root`)

| Token | Wert |
|---|---|
| `--bg` | `#08080a` |
| `--text` / `--text-2` / `--text-3` | `#ededf0` / `#a1a1aa` / `#8b8b96` (Kontrast ≥ 4,5) |
| `--accent` | `#fb923c`, Hover `#fda15a`, `--accent-2` `#f97316` |
| `--c-blue` / `--c-violet` | `96,165,250` / `167,139,250` (aus v6) |
| `--line` | `rgba(255,255,255,.08)` |
| Schriften | Space Grotesk (Display), Inter (Text), DM Mono (Marker) |

## Struktur

```
Nav (Glas-Pill, Sound-Schalter, Kontakt)
Hero (Headline + Roboter-Avatar)
Film / SHW-01 (sticky Bühne, v6)
Fähigkeiten (2×2 Kacheln mit Bots)
Die Plattform (Bento, 5 Kacheln: Agentische Infrastruktur (Anker), MD_Process, KI-Agenten & KI-Mitarbeiter („Bald“, HV als Beispiel), BloomMD, wave-mesh) + kleine Referenz Anipal
Team (+ Zeile „Plus ein Team aus KI-Agenten“)
Kontakt (statisches Formular: Name, E-Mail, Betreff, Nachricht; Validierung + aria-invalid/aria-live; Versand per mailto an admin@, kein externer Dienst)
Footer (groß)
```

## Assets

| Datei | Zweck | Größe |
|---|---|---|
| `assets/video/v6-preview.mp4` | stumme Vorschau | 481 KB, 12 s |
| `assets/video/v6-main.mp4` | Film mit Ton, lädt erst beim Klick | 7,2 MB, 48 s |
| `assets/img/v6-poster.jpg` | Poster | 43 KB |
| `assets/img/roboter.webp` | Avatar (PNG als Fallback) | 22 KB |
| `assets/img/bots/bot-*.webp` | 2D-Bots aus v6, Sekunde 4 | je ca. 4 KB |
| `assets/img/showcase/*.webp` | Stills aus v6 (Sekunde 30 und 2) | 16–23 KB |

Das MD_Process-Video und das 3D-v9-Video sind nicht im Repo und nicht auf der Seite.

## Offen vor dem Live-Gang

- **ElevenLabs:** Für Stimmen und Musik im v6-Video ist vor dem Live-Gang ein bezahlter ElevenLabs-Plan nötig (kommerzielle Nutzung). Das entscheidet Max.
- **Sprache:** Das Video ist auf Englisch, die Seite auf Deutsch. Ob es eine deutsche Fassung gibt, entscheidet Max.
- **Merge = Live:** Ein Merge auf `main` geht sofort über GitHub Pages live. Er braucht Max' Freigabe.

## Phase 4 (Max, 21.11. 16:47)

ProcessCube raus, SitePilot bleibt draußen. Plattform zeigt nur MD_Process, BloomMD, wave-mesh, Agenten-Infrastruktur, KI-Agenten/KI-Mitarbeiter. Warteliste über das Kontaktformular (Betreff „KI-Mitarbeiter Warteliste“, CTAs mit `data-subject` setzen den Betreff vor, auch `?betreff=` in der URL). Öffentlich nur „Pilotphase startet bald“.
