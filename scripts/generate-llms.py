"""Generate the same public main text for readers and crawlers; --check detects drift."""
from html.parser import HTMLParser
from pathlib import Path
import sys
class Text(HTMLParser):
 def __init__(self):
  super().__init__(); self.main=False; self.skip=0; self.parts=[]
 def handle_starttag(self,tag,attrs):
  if tag=='main': self.main=True
  if tag in ('script','style'): self.skip+=1
 def handle_endtag(self,tag):
  if tag=='main': self.main=False
  if tag in ('script','style'): self.skip-=1
 def handle_data(self,data):
  if self.main and not self.skip and data.strip(): self.parts.append(' '.join(data.split()))
sections=[]
for file,title,url in [('index.html','Startseite','/'),('hausverwaltung/index.html','Hausverwaltung','/hausverwaltung/')]:
 p=Text();p.feed(Path(file).read_text());sections.append('# '+title+'\nQuelle: https://moellenbeck-digital.io'+url+'\n\n'+'\n\n'.join(p.parts))
content='\n\n'.join(sections)+'\n'; target=Path('llms-full.txt')
if '--check' in sys.argv:
 assert target.read_text()==content, 'llms-full.txt stale: run python3 scripts/generate-llms.py'
else: target.write_text(content)
