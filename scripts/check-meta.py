"""Check head metadata and JSON-LD of every sitemap page, without a server.

Per page: title <= 60 and description <= 155 characters, both unique; canonical = sitemap URL;
lang="de"; exactly one <h1>; every <img> has an alt attribute; complete Open Graph and Twitter card
(og:url = canonical, image 1200x630 from the repo file, image alt); JSON-LD parses; a WebPage node
with @id <url>#webpage, isPartOf #website and a BreadcrumbList that ends at the page; every @id
reference resolves on this page or on the start page; dateModified equals the visible date
(<time datetime> or "Stand: <d>. <Monat> <yyyy>") and is only set when a visible date exists.
WebPage.name = <title>; og:title = twitter:title = <title>; sitemap lastmod = dateModified where dateModified is set.
Start page: Organization (#org, logo) and WebSite (#website).

Usage: python3 scripts/check-meta.py   (exit code 1 on failure)
"""
import html,json,re,struct,sys,xml.etree.ElementTree as ET
from pathlib import Path
ROOT='https://moellenbeck-digital.io'
MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
SM='{http://www.sitemaps.org/schemas/sitemap/0.9}'
urls=list(ET.parse('sitemap.xml').getroot().iter(SM+'url'))
locs=[u.findtext(SM+'loc') for u in urls]
lastmod={u.findtext(SM+'loc'):u.findtext(SM+'lastmod') for u in urls}
def file_for(url):
 path=url[len(ROOT):].lstrip('/'); return Path(path+'index.html' if path.endswith('/') or path=='' else path)
def png_size(p):
 with open(p,'rb') as f: head=f.read(24)
 assert head[:8]==b'\x89PNG\r\n\x1a\n'; return struct.unpack('>II',head[16:24])
def graph(src): return [n for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>',src,re.S) for n in json.loads(b)['@graph']]
def ids(nodes): return {n['@id'] for n in nodes if '@id' in n}
def refs(o):
 if isinstance(o,dict):
  if set(o)=={'@id'}: yield o['@id']
  for v in o.values(): yield from refs(v)
 elif isinstance(o,list):
  for v in o: yield from refs(v)
errors=[];titles={};descs={}
home_nodes=graph(Path('index.html').read_text())
for url in locs:
 f=file_for(url); src=f.read_text(); head=src.split('</head>')[0]; E=lambda m: errors.append(f'{f}: {m}')
 meta=lambda a,n: (lambda m: html.unescape(m[1]) if m else None)(re.search(r'<meta '+a+'="'+re.escape(n)+r'" content="([^"]*)">',head))
 t=html.unescape(re.search(r'<title>(.*?)</title>',head,re.S)[1].strip()); d=meta('name','description')
 if len(t)>60: E(f'title {len(t)} > 60 chars')
 if not d or len(d)>155: E('description missing or > 155 chars')
 if t in titles: E('title not unique, same as '+titles[t])
 if d in descs: E('description not unique, same as '+descs[d])
 titles[t]=str(f);descs[d]=str(f)
 can=re.search(r'<link rel="canonical" href="([^"]+)">',head)
 if not can or can[1]!=url: E(f'canonical {can and can[1]} != {url}')
 if not re.search(r'<html lang="de"',src): E('lang="de" missing')
 if len(re.findall(r'<h1[\s>]',src))!=1: E('not exactly one <h1>')
 for img in re.findall(r'<img\b[^>]*>',src):
  if not re.search(r'\balt="',img): E('img without alt: '+img[:80])
 need={('property','og:type'):None,('property','og:url'):url,('property','og:title'):None,('property','og:description'):None,
  ('property','og:image'):None,('property','og:image:width'):'1200',('property','og:image:height'):'630',('property','og:image:alt'):None,
  ('property','og:locale'):'de_DE',('name','twitter:card'):'summary_large_image',('name','twitter:title'):None,
  ('name','twitter:description'):None,('name','twitter:image'):None,('name','twitter:image:alt'):None}
 for (a,n),want in need.items():
  v=meta(a,n)
  if not v: E(n+' missing')
  elif want and v!=want: E(f'{n} = {v!r}, want {want!r}')
 for n in ['og:image','twitter:image']:
  v=meta('property' if n.startswith('og') else 'name',n)
  if v:
   img=file_for(v) if v.startswith(ROOT) else None
   if not img or not img.is_file(): E(n+' not a file in the repo: '+v)
   elif png_size(img)!=(1200,630): E(f'{n} size {png_size(img)} != 1200x630')
 nodes=graph(src)
 page=next((n for n in nodes if n.get('@type')=='WebPage'),None)
 if not page or page.get('@id')!=url+'#webpage': E('WebPage node with @id '+url+'#webpage missing')
 elif page.get('isPartOf')!={'@id':ROOT+'/#website'}: E('WebPage.isPartOf != #website')
 elif page.get('name')!=t: E(f'WebPage.name {page.get("name")!r} != title {t!r}')
 if meta('property','og:title')!=meta('name','twitter:title'): E('og:title != twitter:title')
 if meta('property','og:title')!=t: E(f'og:title {meta("property","og:title")!r} != title {t!r}')
 if not (d==meta('property','og:description')==meta('name','twitter:description')): E('description, og:description and twitter:description differ')
 crumbs=next((n for n in nodes if n.get('@type')=='BreadcrumbList'),None)
 if not crumbs or crumbs['itemListElement'][-1]['item']!=url: E('BreadcrumbList missing or not ending at the page')
 for r in set(refs(nodes))-ids(nodes)-ids(home_nodes): E('unresolved @id '+r)
 visible=[m for m in re.findall(r'<time datetime="(\d{4}-\d{2}-\d{2})">',src)]
 for dd,mm,yy in re.findall(r'Stand: (\d{1,2})\. ('+'|'.join(MONTHS)+r') (\d{4})',src):
  visible.append(f'{yy}-{MONTHS.index(mm)+1:02d}-{int(dd):02d}')
 dm=page and page.get('dateModified')
 if visible and dm not in visible: E(f'dateModified {dm} not in visible dates {sorted(set(visible))}')
 if dm and not visible: E('dateModified set without a visible date')
 if dm and lastmod.get(url)!=dm: E(f'sitemap lastmod {lastmod.get(url)} != dateModified {dm}')
 if url==ROOT+'/':
  org=next((n for n in nodes if n.get('@type')=='Organization'),{})
  site=next((n for n in nodes if n.get('@type')=='WebSite'),{})
  if org.get('@id')!=ROOT+'/#org' or not org.get('logo'): E('Organization #org with logo missing')
  if site.get('@id')!=ROOT+'/#website': E('WebSite #website missing')
for e in errors: print('FAIL',e)
if errors: sys.exit(1)
print(f'meta ok: {len(locs)} sitemap pages, title/description unique, canonical, OG+Twitter complete (image 1200x630), '
 'img alt, WebPage+BreadcrumbList, WebPage.name = og:title = twitter:title = title, description = og = twitter, '
 '@id resolved, dateModified = visible date = sitemap lastmod')
