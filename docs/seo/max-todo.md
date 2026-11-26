# Offene Freigaben und Belege

- Offizielle Unternehmensprofile (LinkedIn, GitHub-Organisation, Verzeichnisse) bestätigen. `design.html` verlinkt ein GitHub-Repository, nicht ein Personenprofil; daraus wird kein Person/sameAs abgeleitet.
- Person, Rolle und offizielle Profil-URLs für Person-Schema bestätigen. Keine erfundenen Profile ergänzt.
- Search Console und Bing verifizieren, Sitemap einreichen; IndexNow-Schlüssel erst im freigegebenen Deploy bereitstellen.
- Bestehende Claims, Testfragen und externe Sichtbarkeitsmessungen bestätigen. Feld-CWV/INP bleiben offen.

## Runde 5 – Hebel, die nur Max freigeben kann (26.11.2026)

Sortiert nach Wirkung je Aufwand. Punkte = Rubrik `seo`/`geo`. Nichts davon ist umgesetzt.

| # | Hebel | Was Max tut (exakt) | Punkte |
|---|---|---|---|
| 1 | Search Console + Bing | Domain-Property `moellenbeck-digital.io` in Search Console anlegen, DNS-TXT aus dem Dialog setzen. Bing: „Import from Google Search Console“. In beiden einreichen: `https://moellenbeck-digital.io/sitemap.xml`. | SEO E +5 |
| 2 | Testfragen bestätigen | Antwort an dev: „Testfragen 1–15 bestätigt“ oder Nummern streichen/umformulieren. Danach Vorher-Messung nach `docs/geo/messung.md`. | GEO E bis +5, nach Wiederholung bis +2 |
| 3 | `sameAs` | Offizielle URLs nennen (nur vorhandene Profile): LinkedIn-Unternehmensseite, GitHub-Organisation. dev trägt sie ein als `"sameAs": ["<LinkedIn-URL>", "<GitHub-URL>"]` im Organization-Knoten `#org` (Start und HV). | SEO C +2, GEO D +2 |
| 4 | „Für wen nicht“ | Vorschlag nur aus vorhandenen Aussagen, zur Freigabe oder Korrektur. HV-FAQ, neue Frage „Für wen ist der KI-Mitarbeiter nicht gedacht?“, Antwort: „Für Hausverwaltungen, die Antworten ohne menschliche Freigabe versenden wollen. Außer der Standardantwort geht ohne Freigabe nichts raus.“ Start-FAQ: eigener Satz von Max. | GEO C bis +2 |
| 5 | Externer Schema-Validator | Freigabe: „HTML der 5 Seiten darf an validator.schema.org gesendet werden“ (Inhalt ist nach Merge ohnehin öffentlich). Alternativ nach Deploy gegen die Live-URLs. | SEO C +1 |
| 6 | Transkript Startseiten-Film | Englisches Transkript bestätigen oder ablehnen (Entwurf im PR-Text von Runde 3). | GEO A +1 |
| 7 | Claims | Bestätigen oder streichen: „Einrichtung unter einem Tag“, „Haftungsschutz im Code“. | GEO C bis +2 |
| 8 | VideoObject | Veröffentlichungsdatum je Film nennen (`uploadDate`). Ohne Datum kein VideoObject. | kein fester Punkt |
| 9 | llms-full im Hosting-Build | Kein Max-Schritt: gehört zum Härtungs-PR (`pages.yml`). Nach Umstellung auf `build_type=workflow` dort `python3 scripts/generate-llms.py --check` vor dem Upload ausführen. | GEO B bis +2 |
| 10 | Feld-CWV | Kein Schritt möglich, bis Search Console (Nr. 1) Felddaten zeigt. | SEO D bis +10 |
