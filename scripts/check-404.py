"""Check the custom 404 page, without a server.

GitHub Pages serves 404.html with status 404 for every unknown path, at any depth.
So every link and asset must be root-relative ("/...") and point to a published file.
The page must not be indexed: robots noindex, no canonical, not in the sitemap.
Attributes are read with html.parser (any quoting or case; comments ignored).
Run: python3 scripts/check-404.py
"""
import re, sys, fnmatch, xml.etree.ElementTree as ET
from html.parser import HTMLParser
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

def srcset_urls(v):
    """URLs of a srcset value (HTML spec: URL = run of non-space; trailing commas end the candidate)."""
    out, i, n = [], 0, len(v)
    while i < n:
        while i < n and (v[i].isspace() or v[i] == ','): i += 1
        j = i
        while j < n and not v[j].isspace(): j += 1
        url = v[i:j]
        if not url: break
        i = j
        if url.endswith(','):
            url = url.rstrip(',')
        else:
            while i < n and v[i] != ',': i += 1   # skip descriptors
        out.append(url)
    return out

class Tags(HTMLParser):
    """Real HTML parsing: case-insensitive names, any quoting, comments and scripts ignored."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.robots, self.canonical, self.h1, self.refs = [], 0, 0, []
    def handle_starttag(self, tag, attrs):
        a = {}
        for k, v in attrs:          # HTML spec: the first of duplicate attributes wins
            a.setdefault(k, v or '')
        if tag == 'meta' and a.get('name', '').lower() == 'robots':
            self.robots += [t.strip().lower() for t in a.get('content', '').split(',')]
        if tag == 'link' and 'canonical' in a.get('rel', '').lower().split():
            self.canonical += 1
        if tag == 'h1':
            self.h1 += 1
        for k in ('href', 'src', 'poster'):   # exact attribute names: data-href etc. do not count
            if k in a:
                self.refs.append(a[k].strip())   # an empty value is reported below
        for url in srcset_urls(a.get('srcset', '')):
            self.refs.append(url)
    handle_startendtag = handle_starttag

tags = Tags()
tags.feed(html)
if '404.html' not in allow:
    fail.append('404.html not in scripts/pages-allowlist.txt')
if 'noindex' not in tags.robots:
    fail.append('robots noindex missing')
if tags.canonical:
    fail.append('canonical must not be set on the 404 page')
locs = [e.text for e in ET.parse('sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
if any(l.endswith('/404.html') for l in locs):
    fail.append('404.html must not be in sitemap.xml')
if tags.h1 != 1:
    fail.append('exactly one h1 expected')
refs = tags.refs
checked = 0
for ref in refs:
    if ref.lower().startswith(('mailto:', 'data:', '#')):
        continue
    if not ref:
        fail.append('empty href/src/poster'); continue
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
