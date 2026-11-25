"""Prepare a verification file only. Never submits URLs or generates a key."""
import os,re
from pathlib import Path
key=os.environ.get('INDEXNOW_KEY','')
if not re.fullmatch(r'[a-zA-Z0-9-]{8,128}',key):
 raise SystemExit('INDEXNOW_KEY must contain 8–128 ASCII letters, digits or hyphens')
target=Path(key+'.txt')
if target.exists() and target.read_text()!=key:
 raise SystemExit('Refusing to overwrite an unrelated file')
target.write_text(key)
print('IndexNow verification file prepared; no submission performed.')
