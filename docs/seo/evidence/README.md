# Lokale Prüfung · 26.11.2026

Server im Checkout starten: `python3 -m http.server 8897 --bind 127.0.0.1`

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Browser: Axe, Links, Anker, H1 mobil, Breadcrumb, Hinweis | `TOOLS_DIR=<node_modules> node docs/seo/evidence/check.cjs` | Exit 0 |
| SEO/GEO-Regression (nur Port ersetzt) | `python3 -c "exec(open('docs/seo-geo/check.py').read().replace('8876','8897'))" > docs/seo/evidence/regression.json` | Exit 0 |
| HTML | `npx --yes html-validate 'hausverwaltung/ratgeber/**/index.html' 'ratgeber/**/index.html'` (11.22.1) | Exit 0, keine Meldungen |
| Lighthouse 13 mobil, drei Entwürfe | `lighthouse <url> --output=json --chrome-flags="--headless=new"` | lighthouse-summary.json |

Weitere Pfade für check.cjs (BASE_URL, CHROME_PATH, OUT_DIR, SHOT_DIR) stehen oben im Skript.
`<node_modules>` braucht playwright und @axe-core/playwright, z. B. nach `npm ci` in audit/tools.

| Beleg | Inhalt |
|---|---|
| browser-checks.json | acht Routen: Axe, Links, Ladefehler |
| h1-mobil.json, h1-mobil.jpg | H1-Textkanten bei 320/360/375/390/412 px, Screenshots der Entwürfe |
| content-checks.json | Breadcrumb gleich Schema, aria-current, Hinweis vor erster Aussage |
| lighthouse-summary.json | Kurzfassung; Rohberichte liegen nicht im Repo |

SEO 69 kommt vom beabsichtigten noindex (einziges durchgefallenes Audit: is-crawlable).
Nicht geprüft: Live, echte Mobilgeräte, Safari/Firefox, externer Schema-Validator, KI-Sichtbarkeit, Max-Inhaltsabnahme.

Bekannt, unverändert gegenüber main: /hausverwaltung/ hat bei 320 px eine H2 („Haftungsschutz im Code.“), die über den Rand reicht (Textende 335 px).
