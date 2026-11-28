# Tests KI-Brief-Check

```sh
node --test tests/ki-brief-check/*.test.cjs      # ohne Abhängigkeiten, Node >= 20
(cd audit/tools && npm ci) && node audit/ki-brief-check/browser.cjs   # Browser-Prüfung + Screenshots
```

- `fixtures/`: 10 frei erfundene Briefe, `expected.json` mit allen erwarteten Treffern.
- `counter-statements.json`: Verneinungen und Umkehrungen, die kein falsches Urteil auslösen dürfen.
- `befunde-r1.json`, `befunde-r2.json`: Sätze aus den Prüfrunden. Falsche nie „belegt“, richtige nie „fraglich“.
- `befunde-r3.json`: Kontextsätze zu fünf Katalog-Einträgen (Prüfproben und eigene Umformulierungen). Davor oder danach: nie „fraglich“.
- `gegenproben-r1-eigen.json`: 15 Gegenproben aus Runde 1.
- Eigenschaftsprüfung im Test: jede Variante eines Katalog-Satzes (Verneinung, Folgesatz, anderer Rechtsbereich, andere Zahl, Frage, Zitat) ist „unklar“.
- Invariante: ohne exakten Katalogtreffer gibt es nur „unklar“.
- „belegt“ und „fraglich“ gibt es nur für die Musterformulierungen im Katalog (`knowledge.js`). Frei formulierte Aussagen sind „unklar“ (gewollt).
- Die Tests zeigen Konsistenz, **keine Trefferquote** an echten Briefen und **keine juristische Richtigkeit**.

## Restlücke

**Abgedeckt (Korrektur R3):** Bei fünf „fraglich“-Einträgen sperrt ein passender Umstand in jedem anderen Satz des Briefs, davor oder danach. Ergebnis: „unklar“ mit neutralem Entwurf.

| Eintrag | Signalwörter (Auszug) |
|---|---|
| `aufzug-nutzung` | Beschluss, beschlossen, Vereinbarung, Teilungserklärung, Gemeinschaftsordnung |
| `wallbox-kosten` | beschlossen, einstimmig, Beschluss (nicht „kein(en) Beschluss“), Kostenübernahme, Vereinbarung, Mehrheit |
| `einladung-zwei-wochen` | Teilungserklärung, Gemeinschaftsordnung, vereinbart, Vereinbarung, Dringlichkeit |
| `kopien-kostenlos` | Verwaltervertrag, zugesagt, zugesichert, Beschluss, beschlossen, vereinbart |
| `minderung-ohne-anzeige` | weiß, wusste, Bescheid, informiert, besichtigt, gemeldet, angezeigt, Kenntnis, Hausmeister … aufgenommen |

Die Sperren greifen bewusst breit. Sie lesen den Zusammenhang nicht. Ein unpassendes Signalwort führt ebenfalls zu „unklar“.

**Offen:**
- Umstände ohne Signalwort bleiben unerkannt, auch bei diesen fünf Einträgen (Beispiel: „Der Vermieter stand im Januar selbst vor dem Schimmel.“).
- Die übrigen Katalog-Einträge haben diese Prüfung nicht. Das gilt für „fraglich“ und „belegt“.
- Freie Widersprüche ohne Signalwort bei „belegt“ bleiben unerkannt (Beispiele: „Wir haben dafür ein ganzes Jahr.“, „Der Beirat muss erst zustimmen.“). Dann steht das Katalog-Urteil.
