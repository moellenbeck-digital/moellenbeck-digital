# DESIGN.md — Moellenbeck-Digital 2026 (Phase 2)

## Ziel

Hochwertige statische Seite im Stil von x.ai, in MD-Farben. Prinzipien übernommen, nicht kopiert.

## Design-Prinzipien

1. **Tiefschwarz, Licht als Gestaltung** – `#08080a` als Basis; weiche Glows (Orange, Blau, Violett) als radial-gradients; feine 1px-Separatoren.
2. **Hero vollflächig und kinematisch** – v6-Preview-Video als Hintergrund (object-fit: cover), Vignette für Lesbarkeit.
3. **Riesige, ruhige Headlines** – Space Grotesk, `clamp(3.2rem, 9vw, 8.5rem)` im Hero, `clamp(2.5rem, 6vw, 5rem)` in Sektionen. Enge Laufweite (`letter-spacing: -0.04em`).
4. **Video integriert statt eingebettet** – Kanten per `mask-image` radial-gradient in den Hintergrund auslaufend; Scroll-Scale von 78 % auf 100 % via rAF-gedrosseltem IntersectionObserver/scroll.
5. **Eigener Player** – Glas-Pill (`backdrop-filter: blur(20px)`) mit Fortschrittslinie (2px, orange), kein Browser-Chrome; tastaturbedienbar.
6. **Fähigkeiten als 2×2-Kacheln** – 1px-Gitter (`gap: 1px; background: var(--border)`), Hover-Glow.
3D-MD-Roboter GROSS als Maskottchen – CSS float-Animation, Scroll-Parallax.
7. **Grain/Noise-Overlay** – statische SVG-feTurbulence-Kachel (200px), `opacity: 0.028`, `position: fixed`, GPU-schonend.
8. **Motion dezent** – `prefers-reduced-motion`: alle Animationen aus, Poster statt Video.
9. **Navigation minimal und glasig** – `backdrop-filter: blur(16px)`, sehr subtile Borderline.
10. **Footer** – riesiges `MD_`-Wordmark (`opacity: 0.045`), Cursor-Blink.

## Token-System (`style.css :root`)

| Token | Wert |
|---|---|
| `--bg` | `#08080a` |
| `--bg-elevated` | `#0e0e11` |
| `--bg-card` | `#141418` |
| `--text` | `#e8e8ed` |
| `--text-muted` | `#5a5a65` |
| `--accent` | `#fb923c` (Orange, einziger harter Akzent) |
| `--accent-glow` | `rgba(251,146,60,0.28)` |
| `--glow-blue` | `rgba(96,165,250,0.16)` (aus v6) |
| `--glow-violet` | `rgba(167,139,250,0.12)` (aus v6) |
| `--border` | `#1e1e24` |
| `--display` | Space Grotesk |
| `--mono` | DM Mono |
| `--sans` | Inter |

## Seitenstruktur

```
Hero (100svh, v6-preview Hintergrund)
Showcase / SHW-01 (v6, Scroll-Scale sticky, Glas-Player)
Fähigkeiten (2×2-Kacheln: KI-Agenten, Prozesse, Web & Apps, Plattform)
Das ist MD_ (Roboter-Maskottchen, gross, schwebend + Parallax)
Team (3-Spalten-Gitter)
Projekte (3-Spalten-Gitter, 7 Kacheln)
Kontakt (zentrierter CTA mit E-Mail)
Footer (MD_-Wordmark + Links)
```

## Video

| Datei | Verwendung | Größe |
|---|---|---|
| `assets/video/v6-preview.mp4` | Hero-Hintergrund + Showcase-Stumm-Loop | 481 KB, 12 s |
| `assets/video/v6-main.mp4` | Showcase mit Ton (Klick auf Glas-Pill) | 7,2 MB, 48 s |
| `assets/img/v6-poster.jpg` | Fallback / `poster=`-Attribut | 43 KB |
| `assets/img/v6-poster.webp` | WebP-Fallback | 21 KB |

Das MD_Process-Video ist **vollständig entfernt** (HTML, CSS, Repo-Assets).

## Offene Punkte (vor Live-Gang)

- **v6 Audio-Lizenz**: ElevenLabs-Tarif für Stimmen/Musik muss Max bestätigen (vgl. `~/moellenbeck-digital/video/audio-v6/notizen.md` falls vorhanden).
- **Sprache**: v6-Video ist EN, Seite DE – Max entscheidet über DE-Fassung des Videos.
- **Bot-Sprites**: Die 2D-Agenten-Bots aus dem v6-Video könnten per ffmpeg-Crop als Stills/Loops in die Fähigkeiten-Kacheln eingebettet werden (Phase 3).
- **Lighthouse**: Ziel Performance ≥ 90 / Accessibility ≥ 90 auf mobile + desktop.
