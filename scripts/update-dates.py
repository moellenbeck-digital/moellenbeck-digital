"""Set dateModified and the visible date from the latest commit date of each page, never the clock.

Order (run in the repo root):
 1. Commit the content changes.
 2. python3 scripts/update-dates.py      then commit the result on the same day.
 3. python3 scripts/generate-llms.py     (llms-full.txt contains the visible date) and commit.
 4. Checks: both generators with --check, then the site checks.

Needs the full Git history: in a shallow clone `git log` reports wrong dates, so the script aborts.
Fix with `git fetch --unshallow`.
A later commit that changes a page's commit date (squash merge, rebase on another day) makes
--check fail; repeat steps 2-4.
"""
import json,re,subprocess,sys
from pathlib import Path
if subprocess.check_output(['git','rev-parse','--is-shallow-repository'],text=True).strip()!='false':
 raise SystemExit('Shallow clone: commit dates are unreliable. Run: git fetch --unshallow')
for file,url in [('index.html','/'),('hausverwaltung/index.html','/hausverwaltung/')]:
 date=subprocess.check_output(['git','log','-1','--format=%cs','--',file],text=True).strip()
 if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',date): raise SystemExit('Missing Git history: '+file)
 p=Path(file);original=p.read_text()
 def schema(m):
  data=json.loads(m[1]);nodes=data['@graph'];node=next((n for n in nodes if n.get('@type')=='WebPage'),None)
  if node is None:
   node={'@type':'WebPage','@id':'https://moellenbeck-digital.io'+url+'#webpage','url':'https://moellenbeck-digital.io'+url};nodes.append(node)
  node['dateModified']=date
  return '<script type="application/ld+json">'+json.dumps(data,ensure_ascii=False)+'</script>'
 updated=re.sub(r'<script type="application/ld\+json">(.*?)</script>',schema,original,flags=re.S)
 months=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];y,m,d=date.split('-')
 updated=re.sub(r'<time datetime="[^"]+">.*?</time>',f'<time datetime="{date}">{int(d)}. {months[int(m)-1]} {y}</time>',updated)
 if '--check' in sys.argv: assert updated==original, file+' date differs from git log'
 else: p.write_text(updated)
 print(file,date)
