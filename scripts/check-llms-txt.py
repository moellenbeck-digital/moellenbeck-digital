"""Check llms.txt against the repository without a server.

1. The blockquote equals the footer description of the start page and the HV page.
2. Every link to moellenbeck-digital.io points to a file in the repo.
3. Every #anchor exists as id="..." in that file.

Usage: python3 scripts/check-llms-txt.py   (exit code 1 on drift)
"""
import html,re,sys
from pathlib import Path
ROOT='https://moellenbeck-digital.io'
text=Path('llms.txt').read_text()
errors=[]
quote=re.search(r'^> (.+)$',text,re.M)
if not quote: errors.append('llms.txt: no blockquote')
for page in ['index.html','hausverwaltung/index.html']:
 m=re.search(r'<div class="footer-brand">.*?<p>(.*?)</p>',Path(page).read_text(),re.S)
 footer=html.unescape(m[1]).strip() if m else None
 if quote and footer!=quote[1].strip(): errors.append(f'{page}: footer {footer!r} != blockquote {quote[1]!r}')
links=re.findall(r'\]\((https?://[^)\s]+)\)',text)
if not links: errors.append('llms.txt: no links')
for url in links:
 if not url.startswith(ROOT+'/'): errors.append('external link: '+url); continue
 path,_,anchor=url[len(ROOT):].partition('#')
 f=Path(path.lstrip('/'))
 if path.endswith('/'): f=f/'index.html'
 if not f.is_file(): errors.append('missing file: '+url); continue
 if anchor and not re.search(r'\bid="'+re.escape(anchor)+'"',f.read_text()): errors.append('missing anchor: '+url)
for e in errors: print('FAIL',e)
if errors: sys.exit(1)
print(f'llms.txt ok: blockquote = footer (2 pages), {len(links)} links, files and anchors exist')
