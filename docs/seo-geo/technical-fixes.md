# Technische Restpunkte · 25.11.2026

Skills: seo, geo, pr-test-merge. Kein Merge/Deploy.

## Ursache
Live-Lighthouse `live-home.json` an Basis 60e4209: is-on-https=0, URL `mailto:admin@moellenbeck-digital.io`, „Allowed with warning“. Zusätzlich inspector-issues=0 (Mixed content). Das Formular-action, nicht der normale E-Mail-Link, löst die Browserwarnung aus. Lokal über HTTP ist sie nicht reproduzierbar: Best Practices bereits vorher 100. Daher keine lokale 77→100-Verbesserung behaupten.

Formular verwendet jetzt method=dialog: kein nativer Netzwerkversand; der bestehende submit-Handler validiert und öffnet unverändert das E-Mail-Programm. Ohne JS bleibt der direkte E-Mail-Link nutzbar, ein Hinweis ergänzt. Es werden keine Eingaben als URL-Query an den Webserver geschickt.

## Generierung
`python3 scripts/update-dates.py` liest je Kernseite `git log -1 --format=%cs -- <Datei>`, setzt WebPage.dateModified und gleiches sichtbares Datum. Nach Content-Commit ausführen; `--check` prüft den gespeicherten Wert. Tagesgenauigkeit entspricht sichtbarem Datum.

`python3 scripts/generate-llms.py` erzeugt llms-full.txt aus demselben öffentlichen main-Text der beiden Kernseiten. `--check` erkennt Drift. Kein Build und keine `.github/workflows` im Repository vorhanden. Vor Veröffentlichung beide Generatoren und Checks ausführen. Nicht automatisch vom Hosting ausgeführt.

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
`node scripts/check-form.cjs`: beide Routen, leere Eingaben abgefangen, gültige Werte als mailto-URI mit Empfänger/Betreff/Nachricht, ohne JS direkter E-Mail-Link und kein nativer POST. Kein Versand.
`python3 docs/seo-geo/check.py`: grün (fünf Seiten, Schema/FAQ-Parität, 84 Bot-Routen, Rechtstext-Bodies bytegleich).
`node audit/check.cjs`: grün (axe und interne Links auf fünf Seiten).
`python3 scripts/generate-llms.py --check` und `python3 scripts/update-dates.py --check`: grün.
IndexNow mit synthetischem Testwert in temporärem Verzeichnis geprüft: exakter Dateiinhalt; leere, kurze und Pfad-Traversal-Werte abgewiesen. Keine Einreichung.

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

Belege: `evidence/60e4209ed90539fa4ed3a38345eb00738e63dda9/` und `evidence/2811c2912e730eafb590b759e85e0c194f6302e9/`. Implementierung am 2811c2912e730eafb590b759e85e0c194f6302e9 gemessen; abschließender Beleg-Commit ändert keine Produktionsdateien. HTTPS Zusatzmessungen Root und HV: BP jeweils 100, is-on-https und inspector-issues jeweils 1.
