from html.parser import HTMLParser
from pathlib import Path
import json,re,subprocess,xml.etree.ElementTree as ET
from urllib.request import urlopen,Request
class VisibleBody(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.stack=[]; self.parts=[]
 def handle_starttag(self, tag, attrs):
  attrs=dict(attrs)
  blocked=tag in ('script','style','template','noscript') or 'hidden' in attrs or attrs.get('aria-hidden')=='true'
  if tag not in ('br','img','input','meta','link','hr','source','wbr','area','base','embed','param','track','col'):
   self.stack.append((tag,blocked))
 def handle_endtag(self, tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:
    del self.stack[i:]; break
 def handle_data(self, data):
  if any(t=='body' for t,b in self.stack) and not any(b for t,b in self.stack): self.parts.append(data)
def visible_text(html):
 parser=VisibleBody(); parser.feed(html)
 return ' '.join(' '.join(parser.parts).split())
# Regression: schema-only and explicitly hidden answers must never satisfy parity.
assert 'schema-only' not in visible_text('<body><script>schema-only</script></body>')
assert 'hidden-only' not in visible_text('<body><div hidden>hidden-only</div></body>')
assert visible_text('<body><details><summary>A &amp; B?</summary><p>Visible answer</p></details></body>')=='A & B? Visible answer'
root='https://moellenbeck-digital.io'
urls=[x.text.replace(root,'') for x in ET.parse('sitemap.xml').findall('.//{*}loc')]
results=[]
for url in urls:
 s=urlopen('http://127.0.0.1:8876'+url).read().decode()
 assert '<html lang="de">' in s
 assert 'href="'+root+url+'"' in s
 graphs=[json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)]
 assert graphs and all(n.get('@id') for g in graphs for n in g['@graph'])
 for g in graphs:
  for n in g['@graph']:
   if n['@type']=='FAQPage':
    for q in n['mainEntity']:
     body=visible_text(s)
     assert ' '.join(q['name'].split()) in body and ' '.join(q['acceptedAnswer']['text'].split()) in body, q['name']
 results.append({'url':url,'status':200,'schema':'JSON parse, IDs and visible FAQ parity passed (not external Schema.org validator)'})
for bot in re.findall('User-agent: (.+)',Path('robots.txt').read_text()):
 for url in ['/','/hausverwaltung/','/robots.txt','/sitemap.xml','/llms.txt','/llms-full.txt']:
  r=subprocess.run(['curl','-fsS','-A',bot,'http://127.0.0.1:8876'+url],capture_output=True)
  assert r.returncode==0,(bot,url)
 results.append({'crawler':bot,'six_routes':'curl 200, static HTML without JS'})
for f in ['impressum.html','datenschutz.html','legal/index.html']:
 old=subprocess.check_output(['git','show','8f741d2:'+f]).decode();new=Path(f).read_text()
 assert re.split(r'<body[^>]*>',old)[1]==re.split(r'<body[^>]*>',new)[1],f
print(json.dumps(results,indent=2,ensure_ascii=False))
