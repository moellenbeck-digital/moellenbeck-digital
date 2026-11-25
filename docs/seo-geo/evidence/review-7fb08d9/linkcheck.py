from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlsplit,unquote
from concurrent.futures import ThreadPoolExecutor
import subprocess,json,re
root=Path('/tmp/md-pr6-test');refs=set();anchors={};bad=[]
class P(HTMLParser):
 def handle_starttag(self,t,a):
  d=dict(a)
  if 'id'in d: self.ids.add(d['id'])
  for k in ['href','src','poster']:
   if k in d:self.links.append(d[k])
for f in root.rglob('*.html'):
 if any(x in f.parts for x in ['audit','node_modules']):continue
 p=P();p.ids=set();p.links=[];p.feed(f.read_text());rel='/'+str(f.relative_to(root));anchors[rel]=p.ids
 for u in p.links:refs.add(urljoin('https://moellenbeck-digital.io'+rel,u))
for u in re.findall(r'\]\((https?://[^)]+)\)',(root/'llms.txt').read_text()):refs.add(u)
def check(u):
 v=urlsplit(u)
 if v.scheme not in ['http','https']:return {'url':u,'status':'non-http'}
 internal=v.hostname in ['moellenbeck-digital.io','www.moellenbeck-digital.io']
 target='http://127.0.0.1:8876'+v.path if internal else u.split('#')[0]
 r=subprocess.run(['curl','-L','-sS','--max-time','20','-o','/dev/null','-w','%{http_code}',target],capture_output=True,text=True)
 result={'url':u,'status':r.stdout,'error':r.stderr}
 if internal and v.fragment:
  path=unquote(v.path);path=path+'index.html' if path.endswith('/') else path
  result['anchor']=v.fragment in anchors.get(path,set())
 return result
with ThreadPoolExecutor(max_workers=8) as pool:out=list(pool.map(check,sorted(refs)))
(root/'links.json').write_text(json.dumps(out,indent=2));print(json.dumps([x for x in out if x['status'] not in ['200','non-http'] or x.get('anchor')==False],indent=2));print('TOTAL',len(out))
