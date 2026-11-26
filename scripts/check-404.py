"""Check the custom 404 page, without a server.

GitHub Pages serves 404.html with status 404 for every unknown path, at any depth.
So every link and asset must be root-relative ("/...") and point to a published file.
The page must not be indexed: robots noindex, no canonical, not in the sitemap.
Run: python3 scripts/check-404.py
"""
import re, sys, fnmatch, xml.etree.ElementTree as ET
from pathlib import Path

page = Path('404.html')
fail = []
if not page.is_file():
    sys.exit('FAIL 404.html missing')
html = page.read_text()

allow = [l.strip() for l in Path('scripts/pages-allowlist.txt').read_text().splitlines()
         if l.strip() and not l.lstrip().startswith('#')]

def glob_re(g):
    out, i = '', 0
    while i < len(g):
        if g.startswith('**/', i): out += '(?:.*/)?'; i += 3
        elif g[i] == '*': out += '[^/]*'; i += 1
        elif g[i] == '?': out += '[^/]'; i += 1
        else: out += re.escape(g[i]); i += 1
    return re.compile(out + r'\Z')

pats = [glob_re(g) for g in allow]
def public(p): return any(r.match(p) for r in pats)

if '404.html' not in allow:
    fail.append('404.html not in scripts/pages-allowlist.txt')
if not re.search(r'<meta name="robots" content="noindex">', html):
    fail.append('robots noindex missing')
if 'rel="canonical"' in html:
    fail.append('canonical must not be set on the 404 page')
locs = [e.text for e in ET.parse('sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
if any(l.endswith('/404.html') for l in locs):
    fail.append('404.html must not be in sitemap.xml')
if len(re.findall(r'<h1\b', html)) != 1:
    fail.append('exactly one h1 expected')

refs = re.findall(r'(?:href|src)="([^"]+)"', html)
checked = 0
for ref in refs:
    if ref.startswith(('mailto:', '#')):
        continue
    if not ref.startswith('/') or ref.startswith('//'):
        fail.append(f'not root-relative: {ref}'); continue
    path = ref.split('#')[0].split('?')[0].lstrip('/')
    target = path + 'index.html' if path == '' or path.endswith('/') else path
    if not Path(target).is_file():
        fail.append(f'missing file: {ref} -> {target}')
    elif not public(target):
        fail.append(f'not public (allowlist): {ref} -> {target}')
    else:
        anchor = ref.split('#')[1] if '#' in ref else ''
        if anchor and f'id="{anchor}"' not in Path(target).read_text():
            fail.append(f'missing anchor: {ref}')
    checked += 1

if fail:
    for f in fail: print('FAIL', f)
    sys.exit(1)
print(f'404 ok: noindex, no canonical, not in sitemap, one h1, {checked} root-relative links/assets resolve to published files')
