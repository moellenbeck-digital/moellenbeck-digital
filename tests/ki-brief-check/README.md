# Tests KI-Brief-Check

```sh
node --test tests/ki-brief-check/*.test.cjs      # ohne Abhängigkeiten, Node >= 20
(cd audit/tools && npm ci) && node audit/ki-brief-check/browser.cjs   # Browser-Prüfung + Screenshots
```

- `fixtures/`: 10 frei erfundene Briefe, `expected.json` mit allen erwarteten Treffern.
- `counter-statements.json`: Verneinungen und Umkehrungen, die kein falsches Urteil auslösen dürfen.
- `befunde-r1.json`: Sätze aus Prüfrunde 1. Nie „belegt“, immer mindestens ein Hinweis.
- `gegenproben-r1-eigen.json`: 15 Gegenproben, vor dem Regelumbau committet. Autor ist derselbe wie der der Regeln.
- `belegt-beispiele.json`: je „belegt“-Regel ein Beispiel; Abwandlungen davon dürfen nicht „belegt“ bleiben.
- „belegt“ gibt es nur für eng definierte Satzformen. Frei formulierte, richtige Aussagen ergeben meist „unklar“ (gewollt).
- Die Fälle sind zusammen mit den Regeln entstanden (Ausnahme: die zwei R1-Dateien). Sie zeigen Konsistenz, **keine Trefferquote** an echten Briefen
  und **keine juristische Richtigkeit**.
