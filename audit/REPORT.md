# Qualitätsprüfung · 25.11.2026

## Umfang und Ausgang
Eigene Worktree, Branch `quality/codex-audit`. Tatsächliches origin/main nach Fetch:
`3c4cef4dbfd797e85f77fdae8cb030070b8877ab` (Merge von PR #4, enthält erwartetes c07369d).
Keine Claims, Positionierung oder rechtlichen Inhalte geändert. Kein Merge/Deploy.

## Befunde und Änderungen
- **Hoch:** Impressum/Datenschutz hatten kein Main-Landmark (jetzt impressum.html:31, datenschutz.html:31). Skip-Link und beschriftete Navigation ergänzt.
- **Hoch:** `style.css:285` gab auch Rechtstext-Abschnitten 120–220px Abstand; `.page-wrapper` war ungestaltet. Navigation erbte bei Mobilbreite das absolute Landingpage-Dropdown (`style.css:510`). Dokumentbezogene Layoutregeln am Ende der CSS reparieren Lesebreite, Ränder, Rhythmus, Listen, Link-Unterstreichung und umbrechende Navigation. Gilt konsistent auch für verlinkte AGB.
- **Mittel:** Canonical fehlte auf Startseite/Rechtsseiten (jetzt index.html:24, impressum.html:8, datenschutz.html:9, legal/index.html:19). Impressum erhielt sachliche Meta-Description.
- Texte stichprobenweise geprüft; keine belastbaren Rechtschreibfehler korrigiert. Firmenname, Kontakt und Anschrift in beiden Rechtsseiten stimmen überein.

## Messung
Lokaler Python-HTTP-Server 127.0.0.1:8765; installierter Chrome headless; gleiche Lighthouse-Version, Default mobile simulated throttling bzw. Desktop-Preset; jede Kombination einmal vor/nach, seriell. Kein Produktions-CDN/TLS-Test. Einzelmessungen sind keine statistisch gesicherte Performanceverbesserung. HV-Code unverändert: dessen Schwankung zeigt Messrauschen.

| Route | Profil | Performance vorher → nach | Accessibility / Best Practices / SEO |
|---|---|---|---|
| Start | mobil | 97 → 97 | jeweils 100 → 100 |
| Start | desktop | 100 → 100 | jeweils 100 → 100 |
| HV | mobil | 99 → 98 | jeweils 100 → 100 |
| HV | desktop | 93 → 100 | jeweils 100 → 100 |

Rohdaten und HTML-Berichte: `before/*.report.{json,html}`, `after/*.report.{json,html}`. Browser-/Lighthouse-Versionen und Timings stehen im JSON; Toolversionen im Lockfile.

## Belege / Reproduktion
- `npm ci --prefix audit/tools`
- `python3 -m http.server 8765 --bind 127.0.0.1`
- `bash audit/measure.sh after`: vier abgeschlossene Lighthouse-Messungen.
- `node audit/browser.cjs after`: 12 Kombinationen, keine JS-Ausnahme, kein horizontaler Overflow, keine defekten geladenen Bilder/Fragmentziele; je ein Main-Landmark. Vorher fehlte Main auf beiden Rechtsseiten.
- Screenshots vor/nach: Start, HV, Impressum, Datenschutz jeweils 375/768/1440px, volle Seite, reduzierte Bewegung. Automatisch erstellt; abschließendes menschliches Designreview offen.
- `node audit/check.cjs`: fünf Seiten, axe WCAG 2 A/AA + 2.1 AA ohne Verstöße, interne HTTP-Links ohne Fehler. Prüfung nach Animation/mit reduced motion: erster unberuhigter Lauf erfasste eine teilweise eingeblendete CTA und wurde als nicht vergleichbar korrigiert.
- `git diff --check`: sauber.
- Externe HEAD-Prüfung: `after/external-links.json`. Python-Systemzertifikate fehlten; zusätzlicher curl-System-TLS-Test dokumentiert Status separat. HEAD-Status ist kein Funktionsnachweis externer Produkte.

## Performance / offene Vorschläge (nicht umgesetzt)
- Bilder bereits WebP, mit Abmessungen; Hero vorab geladen, dekorative Karten lazy/async. Videos preload=none, lokale Fonts font-display=swap. Kein Framework/zusätzliche Laufzeitabhängigkeit eingebaut.
- `impressum.html:67`: Verweise auf §§ 7–10 DDG rechtlich prüfen lassen; nicht eigenmächtig umformuliert.
- `hausverwaltung/index.html:13,21`: OG/Twitter-Description ist generischer als bestehende HV-Meta-Description. Redaktionell angleichen lassen, da Claim-/Positionierungsgrenze.
- Startfilm: Untertitel/Transkript und vollständige Tastatur-/Screenreaderprüfung fachlich prüfen; automatischer Score beweist keine vollständige WCAG-AA-Konformität.
- Shared CSS/JS und Fonts in HV dupliziert; spätere Entkopplung nur mit eigenem Regressionstest, aktuell keine unnötige Architekturänderung.
- Reale Mobilgeräte, Safari, Screenreader, Produktions-Caching und vollständige juristische Prüfung nicht geprüft.
- MCP-Konfiguration dieser Sitzung unvollständig; keine MCP-/Messaging-Erfolge behauptet. Browser/Lighthouse via lokale CLI funktionierten.

Stufe T / Beleg E für aufgeführte maschinelle Prüfungen. R/H offen: Tester und Reviewer prüfen End-SHA separat.
