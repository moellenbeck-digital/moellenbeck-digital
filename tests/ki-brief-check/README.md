# Tests KI-Brief-Check

```sh
node --test tests/ki-brief-check/*.test.cjs      # ohne Abhängigkeiten, Node >= 20
(cd audit/tools && npm ci) && node audit/ki-brief-check/browser.cjs   # Browser-Prüfung + Screenshots
```

- `fixtures/`: 10 frei erfundene Briefe, `expected.json` mit allen erwarteten Treffern.
- `counter-statements.json`: Verneinungen und Umkehrungen, die kein falsches Urteil auslösen dürfen.
- Die Fälle sind zusammen mit den Regeln entstanden. Sie zeigen Konsistenz, **keine Trefferquote** an echten Briefen
  und **keine juristische Richtigkeit**.
