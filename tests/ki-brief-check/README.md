# Tests KI-Brief-Check

```sh
node --test tests/ki-brief-check/*.test.cjs      # ohne Abhängigkeiten, Node >= 20
(cd audit/tools && npm ci) && node audit/ki-brief-check/browser.cjs   # Browser-Prüfung + Screenshots
```

- `fixtures/`: 10 frei erfundene Briefe, `expected.json` mit allen erwarteten Treffern.
- `counter-statements.json`: Verneinungen und Umkehrungen, die kein falsches Urteil auslösen dürfen.
- `befunde-r1.json`, `befunde-r2.json`: Sätze aus den Prüfrunden. Falsche nie „belegt“, richtige nie „fraglich“.
- `gegenproben-r1-eigen.json`: 15 Gegenproben aus Runde 1.
- Eigenschaftsprüfung im Test: jede Variante eines Katalog-Satzes (Verneinung, Folgesatz, anderer Rechtsbereich, andere Zahl, Frage, Zitat) ist „unklar“.
- Invariante: ohne exakten Katalogtreffer gibt es nur „unklar“.
- „belegt“ und „fraglich“ gibt es nur für die Musterformulierungen im Katalog (`knowledge.js`). Frei formulierte Aussagen sind „unklar“ (gewollt).
- Die Tests zeigen Konsistenz, **keine Trefferquote** an echten Briefen und **keine juristische Richtigkeit**.
- Die Wortliste der Kontextsperren ist nicht vollständig. Ein anders formulierter Widerspruch in einem anderen Satz kann unerkannt bleiben
  (Beispiele: „Wir haben dafür ein ganzes Jahr.“, „Der Beirat muss erst zustimmen.“ ohne weiteres Signal). Dann steht das Katalog-Urteil.
