# PRÜFUNG MD@7fb08d9050246b411b89596802644890a11a8207

FAIL für vollständige Score-Abnahme; technische Regressionstests PASS. Kein Merge, keine Produktdateien geändert. Original git status --porcelain leer. Exakter Git-Archiv-Snapshot in /tmp/md-pr6-test. Skills seo, geo, pr-test-merge, trh-ebe gelesen.

## Ausgeführte Prüfungen (E, T / unabhängige Prüfung R teilweise)
- `python3 docs/seo-geo/check.py` im Original (nur lesend, stdout nach /tmp/md-pr6-test/tests.json): exit 0. Fünf Sitemap-Seiten, Canonicals, Schema-IDs, FAQ-Parität, unveränderte Rechtstext-Bodies, 84 lokale Bot/Routen-Requests.
- Browser: `node audit/browser.cjs after` im Snapshot (Port auf 8876 angepasst): exit 0. 12 Kombinationen, vier Seiten × 375/768/1440; keine JS-Fehler, Überläufe, kaputten Bilder oder Fragmentziele. /tmp/md-pr6-test/audit/after/browser.json und PNGs.
- `node audit/check.cjs`: exit 0. Fünf Seiten, null axe-Verstöße, null kaputte interne Links; audit/after/checks.json.
- Desktop-Lighthouse 13.6 auf dem Mac, Chrome headless, Start und HV: jeweils Performance/Accessibility/Best Practices/SEO 100/100. desktop-home.json, desktop-hv.json. Frische PR6-Messungen, nicht PR5.
- Vollständiger statischer HTML-Linkcheck (einschließlich design/og-banner, href/src/poster sowie llms.txt, interne Fragmente, externe HTTP-Ziele): 78 eindeutige Referenzen; alle HTTP-Ziele 200, keine ungültigen Fragmente. `python3 /tmp/md-pr6-test/linkcheck.py`; links.json, links-summary.txt. CSS-URLs/srcset und dynamisch erzeugte JS-Links nicht Bestandteil dieser statischen Vollständigkeitsdefinition.
- Metadaten: fünf eindeutige Descriptions, Längen 100/135/109/76/87; jeweils eine H1. Datenschutztitel 66 Zeichen (zu lang); HTML-Entities im Legal-Titel beim Bewerten dekodieren. metadata.json.

## Scorevorschlag (konservativ, kein 100-Versprechen)
SEO A/B/C/D/E = 24/19/18/10/5 = 76/100. A: neue Dateien lokal belegt, Redirect/404 nur vorhandener Live-Beleg der alten Version; deswegen kein voller Deploy-Nachweis. B: Description-Lücke geschlossen, Title-/Social-/Struktur-Teilabzüge bleiben. C: gültige JSON/FAQ-Parität neu geprüft; externe Validator-Rohbelege im Commit vorhanden, nicht erneut angefragt; sameAs fehlt. D: Desktop jetzt 100/100, mobile 97/99 aus versionierten PR6-Artefakten (nicht neu gemessen); Feld-CWV bleibt 0/10. E: Konten unverifiziert.
GEO A/B/C/D/E = 13/11/17/4/2 = 47/100, nicht 51. Insbesondere C Datum: die Schema-Graphen beider Kernseiten enthalten KEIN dateModified; die bisherigen 4/4 hierfür sind nicht belegt. FAQ je fünf mit sichtbarer Parität belegt. Inhalts-/Faktenqualität ist qualitative Einschätzung B, keine erneute Freigabe von Claims. A: keine Live-WAF-Prüfung je Bot, Video-Transkripte fehlen. B: kein Build-Generator für Spiegel. D: keine sameAs/Person/externe Konsistenz. E: weder bestätigte Fragen noch ausgeführte Sichtbarkeitsbaseline.

## Grenzen N
Keine Live-Bot/WAF-Abnahme für PR6: noch nicht deployed; bisherige Live-Version ist kein End-SHA-Beleg. Keine frische Mobile-Messung, keine Feld-CWV/INP, GSC/Bing-Verifizierung, Sitemap-Einreichung, Inhaltsfreigaben, externe Profile, Sichtbarkeitsmessung. Kein interaktiver manueller Host-/Nutzerabnahmelauf; nur automatisierter Mac-Browserlauf mit Screenshots. H deshalb offen. Browser/MCP-Werkzeuge policybedingt nicht verfügbar; Terminal-Playwright nutzte isolierte temporäre Browserkontexte, nicht Max' Chrome-Profil. CI nicht geprüft.

Nächster Schritt: dev-cos korrigiert die Datumspunkte/Score-Dokumente oder beauftragt dateModified-Implementierung; Reviewer prüft Claims. Danach Live-Abnahme erst am autorisierten Deploy. Topic-Zeile bitte durch Parent relayn: 🔁 dev-tester → dev-cos: PR6 Tests grün; GEO-Datumspunkte unbelegt, H und Live-Abnahme offen.
