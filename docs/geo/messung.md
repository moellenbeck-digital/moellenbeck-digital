# GEO-Sichtbarkeit messen · Protokoll

Stand 26.11.2026. Noch keine Messung. Sichtbarkeit: N (nicht gemessen), nicht 0 %.
Werkzeug sendet nichts: `scripts/geo-visibility.py` liest nur `docs/geo/messung.csv`.

## Voraussetzung [MAX]

Testfragen in `docs/geo/testfragen.md` bestätigen (Auswahl und Wortlaut). Vorher keine Messung.

## Ablauf je Messrunde

| Schritt | Was | Wer |
|---|---|---|
| 1 | Jede bestätigte Frage in 4 Assistenten stellen: `chatgpt-suche`, `perplexity`, `gemini`, `claude-websuche` (Websuche an). Neuer Chat, nicht eingeloggt oder ohne Verlauf. | Max oder ein Agent mit Freigabe |
| 2 | Jede Frage 2 Läufe (`lauf` 1 und 2), dazu 1 Umformulierung mit gleicher `frage_nr` (Wortlaut in Spalte `wortlaut`). Antworten schwanken; nur Trends werten. | wie 1 |
| 3 | Je Antwort eine Zeile in `docs/geo/messung.csv`. | wie 1 |
| 4 | `python3 scripts/geo-visibility.py --check`, dann `python3 scripts/geo-visibility.py`. Tabelle unten anhängen. | dev |
| 5 | Ergebnis mit Datum in die Score-Datei des Tages (`docs/geo/score-JJJJ-MM-TT.md`, Block E). | dev |

## Spalten von `messung.csv`

| Spalte | Wert |
|---|---|
| `datum` | Messtag, `JJJJ-MM-TT` |
| `assistent` | `chatgpt-suche` · `perplexity` · `gemini` · `claude-websuche` |
| `frage_nr` | Nummer aus `testfragen.md` |
| `wortlaut` | exakt gestellte Frage |
| `lauf` | 1, 2, … |
| `genannt` | `ja`, wenn Moellenbeck-Digital in der Antwort vorkommt, sonst `nein` |
| `korrekt` | `ja` nur, wenn genannt und die Beschreibung zur Website passt (Hero, FAQ, llms.txt). Sonst `nein` |
| `zitierte_url` | zitierte URL von moellenbeck-digital.io, sonst leer |
| `notiz` | kurz, keine Personendaten |

Quote = genannt und korrekt / alle Abfragen. Leere Datei = N.

## Termine

| Runde | Zeitraum | Status |
|---|---|---|
| Vorher-Messung | nach Bestätigung der Testfragen | offen [MAX] |
| Wiederholung 1 | 09.–23.12.2026 | geplant |
| danach | alle 2–4 Wochen | geplant |

Keine Automation angelegt. Keine bezahlten Tracking-Dienste.

## Ergebnisse

Noch keine.
