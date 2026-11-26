# Technische Restpunkte · 25.11.2026

Skills: seo, geo, pr-test-merge. Kein Merge/Deploy.

## Ursache
Live-Lighthouse `live-home.json` an Basis 60e4209 ([Zusammenfassung](evidence/2811c29/summary.md)): is-on-https=0, URL `mailto:admin@moellenbeck-digital.io`, „Allowed with warning“. Zusätzlich inspector-issues=0 (Mixed content). Das Formular-action, nicht der normale E-Mail-Link, löst die Browserwarnung aus. Lokal über HTTP ist sie nicht reproduzierbar: Best Practices bereits vorher 100. Daher keine lokale 77→100-Verbesserung behaupten.

Formular verwendet jetzt method=dialog: kein nativer Netzwerkversand; der bestehende submit-Handler validiert und öffnet unverändert das E-Mail-Programm. Ohne JS bleibt der direkte E-Mail-Link nutzbar, ein Hinweis ergänzt. Es werden keine Eingaben als URL-Query an den Webserver geschickt.

## Generierung
`python3 scripts/update-dates.py` liest je Kernseite `git log -1 --format=%cs -- <Datei>`, setzt WebPage.dateModified und gleiches sichtbares Datum. Tagesgenauigkeit entspricht sichtbarem Datum.

`python3 scripts/generate-llms.py` erzeugt llms-full.txt aus demselben öffentlichen main-Text der beiden Kernseiten. `--check` erkennt Drift.

Reihenfolge vor jeder Veröffentlichung, im Repo-Root:

1. Content committen.
2. Datum: `python3 scripts/update-dates.py`, Ergebnis am selben Tag committen.
3. llms-full: `python3 scripts/generate-llms.py`, Ergebnis committen. Diese Datei enthält das sichtbare Datum.
4. Checks: `python3 scripts/update-dates.py --check`, `python3 scripts/generate-llms.py --check`, `python3 docs/seo-geo/check.py`, `node audit/check.cjs`, `node scripts/check-form.cjs`.

Schritt 2 braucht die volle Git-Historie. Bei einem shallow clone bricht das Skript mit Fehler ab; Abhilfe: `git fetch --unshallow`. Maßgeblich ist das Commit-Datum. Ein Squash-Merge oder Rebase an einem späteren Tag ändert es: Dann schlägt `--check` fehl und Schritt 2–4 sind zu wiederholen.

Kein Build und keine `.github/workflows` im Repository vorhanden. Nicht automatisch vom Hosting ausgeführt.

PNG-Maße durch `sips -g pixelWidth -g pixelHeight assets/og-image.png`: 1200×630. OG/Twitter verweisen auf dieses Bild. Datenschutztitel 32 Zeichen; Rechtstext-Body unverändert.

FAQ-Fragen jetzt H3 mit sichtbaren Antworten; Wörter und bestehendes FAQPage-Schema unverändert. Keine belegten offiziellen Personenprofile vorhanden; keine Person/sameAs-Behauptung ergänzt. Siehe max-todo.md.

## Konservative Rubrik (lokal, vor unabhängiger Prüfung)
| SEO | Vorher | Nachher |
|---|---:|---:|
| A |24|24|
| B |19|23|
| C |18|18|
| D |10|10|
| E |5|5|
| Gesamt |76|80|

B: Titel +2, Bildmaßbeleg +2; weitere Überschriften/Alt-Punkte nicht neu pauschal vergeben.

| GEO | Vorher | Nachher |
|---|---:|---:|
| A |13|13|
| B |11|13|
| C |15|21|
| D |4|4|
| E |2|3|
| Gesamt |45|54|

B +2 für reproduzierbare Generierung/Driftcheck; automatischer Hosting-Build fehlt weiterhin. C +2 H3-FAQ, +4 Git-Datum mit sichtbarer Parität. E +1 IndexNow-Vorbereitung, keine Einreichung. Sichtbarkeit nicht gemessen.

## Funktion und Checks
`node scripts/check-form.cjs`: beide Routen, leere Eingaben abgefangen, gültige Werte als mailto-URI mit Empfänger/Betreff/Nachricht, ohne JS direkter E-Mail-Link. Submit ohne JS (Button und Enter): 0 Netzwerk-Requests, keine Navigation, Eingaben bleiben erhalten. Kein Versand.

Der statische Server für den Repo-Root muss laufen (`python3 -m http.server 8876 --bind 127.0.0.1`). Konfiguration: `--base-url=URL` oder `--port=N` und `--chrome=PFAD`; alternativ `BASE_URL`, `PORT`, `CHROME_PATH`. Argumente gehen vor. Standard: `http://127.0.0.1:8876`; Google Chrome unter macOS, sonst das Playwright-Chromium.
`python3 docs/seo-geo/check.py`: grün (fünf Seiten, Schema/FAQ-Parität, 84 Bot-Routen, Rechtstext-Bodies bytegleich).
`node audit/check.cjs`: grün (axe und interne Links auf fünf Seiten).
`python3 scripts/generate-llms.py --check` und `python3 scripts/update-dates.py --check`: grün.
IndexNow mit synthetischem Testwert in temporärer Repo-Kopie geprüft: Datei nur unter `.deploy/`, exakter Inhalt; leere, kurze und Pfad-Traversal-Werte abgewiesen. Keine Einreichung. Veröffentlichung: [indexnow.md](../seo/indexnow.md).

Zusätzlicher lokaler HTTPS-Test mit temporärem selbstsignierten Zertifikat und Chrome `--ignore-certificate-errors` prüft die Mixed-Content-Situation; keine Aussage über öffentliche Zertifikate. Live vorher Best Practices 77, lokal HTTPS nachher 100. Live nachher bleibt bis Deploy ungeprüft.

## Lighthouse lokal (P/A/BP/SEO)

| Seite / Modus | Vorher | Nachher |
|---|---|---|
| home mobile | 97/100/100/100 | 97/100/100/100 |
| home desktop | 100/100/100/100 | 100/100/100/100 |
| hv mobile | 99/100/100/100 | 98/100/100/100 |
| hv desktop | 100/100/100/100 | 100/100/100/100 |
| privacy mobile | 100/100/100/100 | 100/100/100/100 |
| privacy desktop | 100/100/100/100 | 100/100/100/100 |

Belege: [evidence/2811c29/summary.md](evidence/2811c29/summary.md) und `summary.json` (vorher 60e4209, nachher 2811c29, SHA-256 je Vollbericht). Die Vollberichte liegen außerhalb des Repos unter `~/Documents/max-os-knowledge/AgenticOS/Dokumente/Projekte/moellenbeck-digital/seo-evidence-2026-11-25/`. Implementierung am 2811c2912e730eafb590b759e85e0c194f6302e9 gemessen; spätere Commits ändern keine ausgelieferten HTML-, CSS- oder JS-Dateien. HTTPS Zusatzmessungen Root und HV: BP jeweils 100, is-on-https und inspector-issues jeweils 1.

Neue Messläufe in ein Verzeichnis außerhalb des Repos schreiben: `bash scripts/lighthouse.sh <Verzeichnis>`. Nur die Zusammenfassung ins Repo übernehmen.
