# PR6 · Belegindex

## Herkunft

review-7fb08d9 enthält unveränderte Tester-Artefakte aus /tmp/md-pr6-test, geprüft am SHA 7fb08d9050246b411b89596802644890a11a8207. REPORT.md erklärt Umfang und Grenzen. Desktop JSON: Lighthouse; audit/after: 12 Browser-Konfigurationen und axe fünf Seiten; links.json: 78 Referenzen. Screenshots verbleiben im temporären Testerordner, nicht als dauerhafter Beleg beansprucht.

## Korrekturrunde

Nur docs geändert; keine Claims, Preise, Positionierung, Rechtstexte oder Schema-Daten geändert. check.py prüft jetzt normalisierten Body-Text ohne script/style/template/noscript und hidden/aria-hidden. CSS-Sichtbarkeit bleibt Browserprüfung; aufgeklappte details-Antworten zählen. Eingebaute Negativkontrollen schließen schema-only/hidden-only aus. `python3 docs/seo-geo/check.py` mit Server 8876: PASS, Ausgabe ../check-results.json; 84 Requests.

SEO A–E: 24/19/18/10/5 = 76 (vorher 44). GEO: 13/11/15/4/2 = 45 (vorher 20). Technische Belege E/T; qualitative Inhaltswertung B. Unabhängiges R am neuen End-SHA offen. H Nutzerabnahme, Live-PR6, Feld-CWV, Konten und Sichtbarkeitsbaseline N/offen. MCP policybedingt unvollständig; keine MCP-Prüfung behauptet. Kein Merge/Deploy.

## SHA256 übernommener Belege

- `b9c36f6c02117fae04bfb3ab53db6928d2b2d8e6a849b47a208f2e2c26f9dbfc` [review-7fb08d9/REPORT.md](review-7fb08d9/REPORT.md)
- `de1a96dc1e87a886a60770819f9b0b3cd603dee5271faef180eec97e739fb955` [review-7fb08d9/audit/after/browser.json](review-7fb08d9/audit/after/browser.json)
- `eaba7ff9160c4e36f35f3d2774aaabd3a6eec48706531dae12cccf9821add4d0` [review-7fb08d9/audit/after/checks.json](review-7fb08d9/audit/after/checks.json)
- `5eca347f11b4c4e3e1e2520d4c15c1c71f080c7ab2e7eedc5b9044341deb6013` [review-7fb08d9/audit/browser.cjs](review-7fb08d9/audit/browser.cjs)
- `2b613dba1344e78fbcce5d6419f45e02c80c19034a05c9d6141ce26a59f5bcb6` [review-7fb08d9/audit/check.cjs](review-7fb08d9/audit/check.cjs)
- `9aae7e0f799f2e0a5f3482a846d34eeefaae799719230fd1249df3e40550b097` [review-7fb08d9/desktop-home.json](review-7fb08d9/desktop-home.json)
- `fb4cb42591a702f90578282152774e23f0f4f5f40c22158303623ca95b67ada9` [review-7fb08d9/desktop-hv.json](review-7fb08d9/desktop-hv.json)
- `531496f8bbb3ff5b37dd06ced9150b51507e048cbbcfd0d2660b311e198e3ccb` [review-7fb08d9/linkcheck.py](review-7fb08d9/linkcheck.py)
- `4bf7512cf4808e13af89a2f26a8f56bee9bbffe9f8318ed336e2deab00a87070` [review-7fb08d9/links-summary.txt](review-7fb08d9/links-summary.txt)
- `8521b600e1889284a21724990e77a4359fc68236e03e46fbfbd95546d0f3854a` [review-7fb08d9/links.json](review-7fb08d9/links.json)
- `ca92f5d28749b30503356c40a279d316d6a8e21342572d8ac7d350ca7767c3f4` [review-7fb08d9/metadata.json](review-7fb08d9/metadata.json)
- `d6ee086f6cc3ff33d51587f38dc96d4e56f128318c80a34c7981294f30617379` [review-7fb08d9/tests.json](review-7fb08d9/tests.json)
