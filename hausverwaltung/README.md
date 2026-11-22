# /hausverwaltung/ – in sich geschlossen

Dieser Ordner läuft auch als eigener Web-Root (z. B. für eine Subdomain `hausverwaltung.moellenbeck-digital.io`).
Darum gibt es hier **eigene Kopien** statt Verweisen auf die Startseite:

| Datei hier | Quelle | Bei Änderung an der Quelle |
|---|---|---|
| `style.css` | `/style.css` + Abschnitt „Unterseite Hausverwaltung“ | HV-Abschnitt behalten, Rest nachziehen |
| `main.js` | `/main.js` + Block „Unterseite Hausverwaltung“ (Video) | HV-Block behalten, Rest nachziehen |
| `assets/fonts/*` | `/assets/fonts/*` (inkl. OFL-Lizenztexte) | 1:1 kopieren |
| `assets/img/bots/*`, Logo, Favicons | `/assets/…` | 1:1 kopieren |

Regeln:
- Nur relative Pfade innerhalb des Ordners. Links auf Startseite, Impressum, Datenschutz als absolute URL `https://moellenbeck-digital.io/…`.
- Prüfen: Ordner allein servieren (`python3 -m http.server` hier drin) → 0 × 404, 0 JS-Fehler.
- Bei einer Subdomain `canonical` und `og:url` in `index.html` anpassen.
