# Lighthouse-Belege · 25.11.2026

Lighthouse 13.6.0. Zeiten in UTC. Maschinenlesbar: [summary.json](summary.json).

- Vorher: Commit `60e4209ed90539fa4ed3a38345eb00738e63dda9`
- Nachher: Commit `2811c2912e730eafb590b759e85e0c194f6302e9`
- Die Commit-Zuordnung stammt aus dem Ablageordner des Messlaufs. Die Berichte selbst enthalten keinen SHA.
- `live-*` misst die öffentliche Seite. `https-*` misst lokal mit selbstsigniertem Zertifikat und ignorierter Zertifikatsprüfung. Alle anderen messen lokal über HTTP.

## Vollberichte

Ablage außerhalb des Repos: `~/Documents/max-os-knowledge/AgenticOS/Dokumente/Projekte/moellenbeck-digital/seo-evidence-2026-11-25/`

Prüfen: SHA-256 aus der letzten Tabelle mit `shasum -a 256 <Datei>` vergleichen.

## Scores (P = Performance, A = Accessibility, BP = Best Practices)

| Phase | Bericht | URL | Zeitpunkt | Modus | P | A | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| vorher | home-desktop | http://127.0.0.1:8876/ | 2026-11-25T21:57:50.483Z | desktop | 100 | 100 | 100 | 100 |
| vorher | home-mobile | http://127.0.0.1:8876/ | 2026-11-25T21:57:36.213Z | mobile | 97 | 100 | 100 | 100 |
| vorher | hv-desktop | http://127.0.0.1:8876/hausverwaltung/ | 2026-11-25T21:58:11.512Z | desktop | 100 | 100 | 100 | 100 |
| vorher | hv-mobile | http://127.0.0.1:8876/hausverwaltung/ | 2026-11-25T21:58:01.208Z | mobile | 99 | 100 | 100 | 100 |
| vorher | live-home | https://moellenbeck-digital.io/ | 2026-11-25T21:58:21.970Z | mobile | – | – | 77 | – |
| vorher | privacy-desktop | http://127.0.0.1:8876/datenschutz.html | 2026-11-25T21:58:37.481Z | desktop | 100 | 100 | 100 | 100 |
| vorher | privacy-mobile | http://127.0.0.1:8876/datenschutz.html | 2026-11-25T21:58:22.801Z | mobile | 100 | 100 | 100 | 100 |
| nachher | home-desktop | http://127.0.0.1:8876/ | 2026-11-25T21:59:35.294Z | desktop | 100 | 100 | 100 | 100 |
| nachher | home-mobile | http://127.0.0.1:8876/ | 2026-11-25T21:59:25.175Z | mobile | 97 | 100 | 100 | 100 |
| nachher | https-home | https://127.0.0.1:8877/ | 2026-11-25T21:59:50.165Z | mobile | – | – | 100 | – |
| nachher | https-hv | https://127.0.0.1:8877/hausverwaltung/ | 2026-11-25T22:00:17.680Z | mobile | – | – | 100 | – |
| nachher | hv-desktop | http://127.0.0.1:8876/hausverwaltung/ | 2026-11-25T21:59:55.770Z | desktop | 100 | 100 | 100 | 100 |
| nachher | hv-mobile | http://127.0.0.1:8876/hausverwaltung/ | 2026-11-25T21:59:45.589Z | mobile | 98 | 100 | 100 | 100 |
| nachher | privacy-desktop | http://127.0.0.1:8876/datenschutz.html | 2026-11-25T22:00:15.724Z | desktop | 100 | 100 | 100 | 100 |
| nachher | privacy-mobile | http://127.0.0.1:8876/datenschutz.html | 2026-11-25T22:00:05.848Z | mobile | 100 | 100 | 100 | 100 |

`–` = Kategorie nicht gemessen.

## Relevante Audits (1 = bestanden, 0 = nicht bestanden)

| Phase | Bericht | is-on-https | inspector-issues | errors-in-console | deprecations | redirects-http |
|---|---|---|---|---|---|---|
| vorher | home-desktop | 1 | 1 | 1 | 1 | n/a |
| vorher | home-mobile | 1 | 1 | 1 | 1 | n/a |
| vorher | hv-desktop | 1 | 1 | 1 | 1 | n/a |
| vorher | hv-mobile | 1 | 1 | 1 | 1 | n/a |
| vorher | live-home | 0 | 0 | 1 | 1 | n/a |
| vorher | privacy-desktop | 1 | 1 | 1 | 1 | n/a |
| vorher | privacy-mobile | 1 | 1 | 1 | 1 | n/a |
| nachher | home-desktop | 1 | 1 | 1 | 1 | n/a |
| nachher | home-mobile | 1 | 1 | 1 | 1 | n/a |
| nachher | https-home | 1 | 1 | 1 | 1 | n/a |
| nachher | https-hv | 1 | 1 | 1 | 1 | n/a |
| nachher | hv-desktop | 1 | 1 | 1 | 1 | n/a |
| nachher | hv-mobile | 1 | 1 | 1 | 1 | n/a |
| nachher | privacy-desktop | 1 | 1 | 1 | 1 | n/a |
| nachher | privacy-mobile | 1 | 1 | 1 | 1 | n/a |

## Befunde mit Einträgen

- vorher · `live-home` · `is-on-https` = 0: `[{"url": "mailto:admin@moellenbeck-digital.io", "resolution": "Allowed with warning"}]`
- vorher · `live-home` · `inspector-issues` = 0: `[{"issueType": "Mixed content", "subItems": {"type": "subitems", "items": [{"url": "https://moellenbeck-digital.io/"}]}}]`

Gewichtete Audits unter 1 stehen je Bericht in `summary.json` unter `weightedAuditsBelow1`.

## Prüfsummen

| Datei unter dem Ablagepfad | Bytes | SHA-256 |
|---|---|---|
| `60e4209ed90539fa4ed3a38345eb00738e63dda9/home-desktop.json` | 522164 | `19a07f50b6d4ef1dff6eb70eb09835d4ee6828fd248ac7993896be744108532f` |
| `60e4209ed90539fa4ed3a38345eb00738e63dda9/home-mobile.json` | 541454 | `187a11dd4c6e5ac00d11abea1c3bbe4a63222a32f4e0b1dba459d265b4069a64` |
| `60e4209ed90539fa4ed3a38345eb00738e63dda9/hv-desktop.json` | 576401 | `281b6111ebe0b6bf0103d96786ee90f5539ffa6b2019f51adcf407b97dbcdc21` |
| `60e4209ed90539fa4ed3a38345eb00738e63dda9/hv-mobile.json` | 792024 | `d61e8a599d0ebc3731c080712e84b5af2ef23f1bee979d6f5306b8e980e3ac8f` |
| `60e4209ed90539fa4ed3a38345eb00738e63dda9/live-home.json` | 107003 | `dc01b56ac06b8b2688a9ed325003cd8beef5df10f45bfdb7f0e15144c7d8d17f` |
| `60e4209ed90539fa4ed3a38345eb00738e63dda9/privacy-desktop.json` | 547366 | `6e34b6c855f323c560c35e5265fa47cf1fa6d2f5878cd8ef10a75b5c8168d9e4` |
| `60e4209ed90539fa4ed3a38345eb00738e63dda9/privacy-mobile.json` | 617811 | `14a331ee7450a03f1cf6113d07e37abee9d972f3b6445beb5a54aa7eff7bb4ba` |
| `2811c2912e730eafb590b759e85e0c194f6302e9/home-desktop.json` | 523757 | `a3bec6ea8ef4fbe079e60b036e6c5486be4c12ecb6d7a934ced578e08d815c1f` |
| `2811c2912e730eafb590b759e85e0c194f6302e9/home-mobile.json` | 540444 | `c0e1f603c56176dc5308aedc4bedc057d88125696d904d488b1e7959cc2e5ae7` |
| `2811c2912e730eafb590b759e85e0c194f6302e9/https-home.json` | 106622 | `98a54f785737f3fb4bc16078eb12416d64f8f69575066328ad6c09752a5e2dce` |
| `2811c2912e730eafb590b759e85e0c194f6302e9/https-hv.json` | 299704 | `a967a846f74431e91d32a211cb4788ea8b0a3129a8117a7421dff7fdbd544f08` |
| `2811c2912e730eafb590b759e85e0c194f6302e9/hv-desktop.json` | 577769 | `0c2e8319c5c4d1e69a6fa8235c7fd8e1aec2cac5d8df703f0be5733058f3f872` |
| `2811c2912e730eafb590b759e85e0c194f6302e9/hv-mobile.json` | 814351 | `ca5b8da37cfe58a67b215adf674d6bf8c1acf5b78bcc3880f99d3a73cee3665c` |
| `2811c2912e730eafb590b759e85e0c194f6302e9/privacy-desktop.json` | 553421 | `4b6bfe2646beef9dfc0b1d22d276137dcdc49f9796d1886a0ce15fcbec8524f9` |
| `2811c2912e730eafb590b759e85e0c194f6302e9/privacy-mobile.json` | 617542 | `4b838df6391eb5f34ae9f82cb260ee0c63bbf9940dda280b80a002f12405fa3c` |
