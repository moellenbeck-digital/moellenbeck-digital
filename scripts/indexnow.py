"""Prepare a verification file in .deploy/ only. Never submits URLs or generates a key."""
import os,re
from pathlib import Path
key=os.environ.get('INDEXNOW_KEY','')
if not re.fullmatch(r'[a-zA-Z0-9-]{8,128}',key):
 raise SystemExit('INDEXNOW_KEY must contain 8–128 ASCII letters, digits or hyphens')
# Git-ignored, independent of the working directory: the key must not end up in a commit by accident.
deploy=Path(__file__).resolve().parent.parent/'.deploy'
deploy.mkdir(exist_ok=True)
target=deploy/(key+'.txt')
if target.exists() and target.read_text()!=key:
 raise SystemExit('Refusing to overwrite an unrelated file')
target.write_text(key)
print('IndexNow verification file prepared in .deploy/; not published, no submission performed.')
