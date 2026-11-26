# Runde 2 · 26.11.2026

Skills pr-test-merge, seo und geo angewandt. Basis c85cb3e (PR #8).

## Live-Abnahme
GitHub Pages meldet c85cb3e38933c780435b205e54c7717e608914d2 als built seit 00:17:03 UTC.
Start, Hausverwaltung, robots, Sitemap und beide llms-Dateien stimmen bytegleich mit main überein.
24 Live-HEAD-Requests (12 explizite KI-Bots × zwei Kernseiten): HTTP 200.
Beleg: ../../evidence/round2/live.json und pages-build.json.
Dies simuliert User-Agent-Zugriff, nicht echte Zugriffe aus den Netzen der Anbieter.
Python-urllib scheiterte zunächst an lokalem CA-Store; curl prüfte TLS erfolgreich ohne -k.

## Änderung
Nicht-deployender GitHub-Actions-Check für den öffentlichen llms-Volltext verhindert unbemerkte Drift in Pull Requests und nach main-Push.
Kein automatisches Publishing oder IndexNow-Submit. IndexNow bleibt nur vorbereitet.
Der Legacy-Pages-Build wird durch diesen Check NICHT gesperrt; Branch Protection ist nicht geändert.
Kein zusätzlicher Punkt für automatischen Hosting-Build: dieser generiert den Spiegel weiterhin nicht selbst.

## Konservative Rubrik
| GEO | Vorher | Nachher | Beleg |
|---|---:|---:|---|
| A |13|18|24 Live-Bot-Requests ergänzen +5; Transkripte weiterhin unbelegt|
| B |13|13|Generator/Driftcheck; kein generierender Hosting-Build|
| C |21|21|Unveränderte öffentliche Inhalte, keine neuen Claims|
| D |4|4|Profile/Personen nicht bestätigt|
| E |3|3|Keine bestätigte Messliste oder echte Suchmessung|
| Gesamt |54|59|Nur belegte Erweiterung der Abnahme|

SEO bleibt konservativ 80/100 (A24 B23 C18 D10 E5). Neue Mobilmessungen sind kein Feld-INP/CWV-Nachweis.
GEO 59 liegt über 54, aber ein deutlich höherer Wert ist ohne Inhalts-/Profilfreigaben nicht belegbar.
Sichtbarkeit: nicht gemessen, nicht 0 Prozent.

## Lighthouse
Aktuelle Live-Mobilwerte einschließlich LCP/CLS/TBT: ../../evidence/round2/summary.json.
Vorher Live-Startseite (25.11. 21:58 UTC): nur Best Practices 77 gemessen; nachher 100.
Keine früheren Live-Performancewerte für beide Routen vorhanden; lokale Vorwerte nicht als Live-Vorher ausgeben.
Vollberichte dauerhaft: AgenticOS/Dokumente/Projekte/md-website/belege/2026-11-26-round2/.

## Grenzen / Max
main ist direkt mit produktivem GitHub Pages verbunden (pages-config.json). Daher KEIN Merge.
Max: Produktionsfreigabe, offizielle Profile/Personen und Content-Claims bestätigen; Testfragen freigeben; GSC/Bing verifizieren und Sitemap selbst einreichen.
IndexNow-Schlüssel/Veröffentlichung weiter Max-only, keine Anfrage gesendet.
Nextcloud-MCP in dieser Sitzung nicht verfügbar; kein MCP-Erfolg behauptet.
PR #7 wird separat an dessen unverändertem SHA geprüft, nicht gemergt.
