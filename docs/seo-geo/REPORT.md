# SEO/GEO · 25.11.2026

Skills: seo-geo und pr-test-merge. Basis 8f741d2. Stufe T, lokale Belege E; unabhängiges Review R und Host-Abnahme H offen. Kein Merge/Deploy.

## Inventar
| URL | Zweck / Zielfrage | Entität |
|---|---|---|
| / | Was baut MD? | Organization, Service |
| /hausverwaltung/ | Was macht der KI-Mitarbeiter? | Service |
| /impressum.html | Wer ist verantwortlich? | Unternehmen |
| /datenschutz.html | Wie werden Daten verarbeitet? | Unternehmen |
| /legal/ | Welche Bedingungen gelten? | Unternehmen |

Zusätzlich öffentlich erreichbare Gestaltungsartefakte: /design.html und /og-banner.html; keine Leistungsseiten, nicht in Sitemap. Assets und Videos sind Ressourcen, keine eigenständigen Landingpages. Keine Produkteigenschaften aus verlinkten fremden Domains übernommen.

## Vorher / Nachher
Basis-Inventar: before.json. Keine robots.txt, sitemap.xml, llms.txt, llms-full.txt oder JSON-LD an Basis. Statisches HTML war bereits vorhanden, kein SSR-Bau erforderlich. Titel, Canonicals und Social-Metadaten waren bereits vorhanden.

Konservative Audit-Scores, keine Ranking-Prognose; N verhindert Vollpunktzahl:
| Kategorie | Vorher | Nachher | Beleg / Lücke |
|---|---:|---:|---|
| Technik | 7 | 8 | Statisches HTML; jetzt explizite Bots und Sitemap. Produktive Redirects/404 N |
| Strukturierte Daten | 0 | 7 | Organization/WebSite/Service/FAQPage/BreadcrumbList. JSON/IDs/FAQ-Parität geprüft; externer Validator N |
| GEO-Inhalt | 6 | 8 | Bestehende Antwortabsätze erhalten, je Kernseite fünf FAQ und Datum. Rechtstexte unverändert |
| KI-Dateien | 0 | 9 | llms.txt und vollständiger sichtbarer Kernseitentext; lokale URLs 200, produktiv N |
| Performance | 9 | 9 | Lighthouse mobil Start vorher/nachher 97; HV nachher 99. Feld-INP N |
| Außen | 0 | 0 | Konten, Indexierung und Profile N; null bedeutet keine Belege, nicht nachgewiesenes Fehlen |

Lighthouse SEO Start vorher/nachher 100; HV nachher 100. Rohdaten lighthouse-*.json. HV-Vorher-Lighthouse fehlt (N); nicht aus Startseite extrapolieren. Lokale Messung, keine Felddaten. GEO-Antwortmaschinen-Vorhermessung N, Testfragen vorbereitet.

## Umsetzung und Quellen
Organization-Adresse und Kontakt ausschließlich aus Impressum. Kein founder, foundingDate, sameAs, Rating oder Preis ergänzt, da keine belastbare Quelle im Repo. Service ohne unbestätigtes areaServed/Angebot. FAQ-Antworten verdichten ausschließlich vorhandenen sichtbaren Inhalt; Standardantwort-Ausnahme der HV ausdrücklich erhalten. Startseite und HV haben bereits Antwortabsätze oben. Rechtstexte bleiben bytegleich im Body; keine neuen juristischen FAQ oder Datumsbehauptungen. Sitemap-lastmod bezeichnet technische Seitenänderung, nicht Rechtsstand.

## Reproduktion
`python3 -m http.server 8876`

`python3 docs/seo-geo/check.py` prüft fünf Canonicals, JSON-LD IDs/FAQ-Parität, unveränderte Rechtstext-Bodies und curl mit 14 User-Agents auf sechs Routen. Ergebnis: check-results.json. Dies ersetzt keinen vollständigen Schema.org-Validator.

`npx --yes lighthouse http://127.0.0.1:8876/ --chrome-flags='--headless --no-sandbox' --only-categories=seo,performance --output=json --output-path=docs/seo-geo/lighthouse-after.json --quiet`

HV entsprechend `/hausverwaltung/`. JSON-Rohdaten enthalten Lighthouse-Version und Messzeit. Keine zusätzlichen Bibliotheken in Produktion. Externer validator.schema.org / Rich Results Test nicht ausgeführt (N). FAQ-Rich-Results-Zulassung durch Google wird nicht behauptet.

## Max-Schritte
1. Nach Freigabe deployen. Domain: `moellenbeck-digital.io`, Sitemap: `https://moellenbeck-digital.io/sitemap.xml`.
2. Search Console Domain-Property `moellenbeck-digital.io` erstellen/prüfen. DNS-TXT exakt aus dem dortigen Dialog übernehmen; Wert derzeit unbekannt, kein Platzhalter im Code.
3. Bing Webmaster Tools: `https://moellenbeck-digital.io/` hinzufügen oder verifizierte Search Console importieren; gleiche Sitemap einreichen. Verifizierungstoken unbekannt.
4. IndexNow erst nach Schlüsselgenerierung vorbereiten. Kein Schlüssel erfunden, keine Anfrage gesendet.
5. Offizielle LinkedIn/GitHub/Verzeichnisprofile bestätigen; erst danach sameAs ergänzen. Keine Profile angelegt.
6. Testfragen in vier Suchassistenten messen: genannt, korrekt, zitierte URL. Nachmessung 09.–23.12.2026.

## Vorschläge, nicht umgesetzt
Bestätigte Gründungsdaten, offizielle Profile, tatsächliche Preise und belastbare Kundenbelege ergänzen. HV-Claims „Einrichtung unter einem Tag“ und Haftungsschutz fachlich bestätigen. Keine Umpositionierung und keine Änderung dieser Claims. Legal-Seiten von FAQ/Datum ausgenommen, um Rechtsstand nicht umzudeuten. Öffentliche Designartefakte bei nächster Freigabe auf noindex prüfen.

## Grenzen
Kein unabhängiges Review/Tester oder visueller Host-Test in diesem Lauf. Externe Validatoren, Live-Crawler, Suchmaschinenkonten und GEO-Nennungen N. MCP-Tools teilweise durch Policy nicht verfügbar; keine MCP-Verifikation behauptet. Nur Codex, kein Fallback.
