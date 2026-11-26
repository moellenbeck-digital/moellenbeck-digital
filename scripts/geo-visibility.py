"""Summarise GEO visibility measurements from docs/geo/messung.csv. Sends no request.

Rate = rows with genannt=ja and korrekt=ja / all rows, per date and assistant.
An empty file is N (not measured), not 0 %.
Columns: datum,assistent,frage_nr,wortlaut,lauf,genannt,korrekt,zitierte_url,notiz
Allowed: assistent in ASSISTANTS; genannt/korrekt in ja|nein; frage_nr = number in docs/geo/testfragen.md;
korrekt=ja requires genannt=ja.
Run: python3 scripts/geo-visibility.py [--check]   (--check: validate only, exit 1 on error)
"""
import csv, re, sys
from collections import defaultdict
from pathlib import Path

ASSISTANTS = {'chatgpt-suche', 'perplexity', 'gemini', 'claude-websuche'}
COLS = ['datum', 'assistent', 'frage_nr', 'wortlaut', 'lauf', 'genannt', 'korrekt', 'zitierte_url', 'notiz']
questions = {int(n) for n in re.findall(r'^(\d+)\. ', Path('docs/geo/testfragen.md').read_text(), re.M)}
rows = list(csv.DictReader(Path('docs/geo/messung.csv').open(encoding='utf-8')))
with Path('docs/geo/messung.csv').open(encoding='utf-8') as f:
    header = next(csv.reader(f))
err = []
if header != COLS:
    err.append(f'header {header} != {COLS}')
for i, r in enumerate(rows, 2):
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', r.get('datum') or ''): err.append(f'line {i}: datum YYYY-MM-DD')
    if r.get('assistent') not in ASSISTANTS: err.append(f'line {i}: assistent {r.get("assistent")!r}')
    if not (r.get('frage_nr') or '').isdigit() or int(r['frage_nr']) not in questions: err.append(f'line {i}: frage_nr')
    if not (r.get('wortlaut') or '').strip(): err.append(f'line {i}: wortlaut empty')
    for k in ('genannt', 'korrekt'):
        if r.get(k) not in ('ja', 'nein'): err.append(f'line {i}: {k} ja|nein')
    if r.get('korrekt') == 'ja' and r.get('genannt') != 'ja': err.append(f'line {i}: korrekt=ja needs genannt=ja')
if err:
    for e in err: print('FAIL', e)
    sys.exit(1)
if '--check' in sys.argv:
    print(f'messung.csv ok: {len(rows)} rows, {len(questions)} test questions'); sys.exit(0)
if not rows:
    print('Sichtbarkeit: N (nicht gemessen), nicht 0 %.'); sys.exit(0)
agg = defaultdict(lambda: [0, 0])
for r in rows:
    for key in ((r['datum'], r['assistent']), (r['datum'], 'gesamt')):
        agg[key][1] += 1
        agg[key][0] += r['genannt'] == 'ja' and r['korrekt'] == 'ja'
print('| Datum | Assistent | genannt und korrekt | Abfragen | Quote |')
print('|---|---|---:|---:|---:|')
for (d, a), (ok, n) in sorted(agg.items()):
    print(f'| {d} | {a} | {ok} | {n} | {ok / n:.0%} |')
