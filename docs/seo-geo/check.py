from pathlib import Path
import json,re,subprocess,xml.etree.ElementTree as ET
from urllib.request import urlopen,Request
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
     assert q['name'] in s and q['acceptedAnswer']['text'] in s
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
