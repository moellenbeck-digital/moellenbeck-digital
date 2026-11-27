"""Check which files GitHub Pages (Jekyll) publishes, derived from _config.yml without a Jekyll install.

Rules modelled after Jekyll 3.10 (github-pages):
 - Paths with a component that starts with "_", ".", "#" or "~" are skipped, unless listed in include.
 - Paths under an exclude entry are skipped.
 - All other tracked files are published. Files with front matter would be rendered.
Checks:
 1. No internal path is published (INTERNAL).
 2. Every required public file is published (REQUIRED).
 3. No published file has front matter, only DESIGN.md is published as raw Markdown (markdown_ext excludes .md),
    so every published file is copied unchanged.
 4. .nojekyll is absent (otherwise _config.yml exclude has no effect).

With --built DIR (output of a real Jekyll build, e.g. actions/jekyll-build-pages):
 5. DIR contains exactly the predicted files, each byte-identical to the repo file.

Usage: python3 scripts/check-pages-exclude.py [--list] [--built _site]   (exit code 1 on failure)
"""
import re,subprocess,sys
from pathlib import Path
cfg=Path('_config.yml').read_text()
def entries(key):
 m=re.search(r'^'+key+r':\s*\n((?:\s+-\s+.+\n?)+)',cfg,re.M)
 return [e.strip().strip('"\'') for e in re.findall(r'^\s+-\s+(.+)$',m[1],re.M)] if m else []
exclude=entries('exclude'); include=entries('include')
def matches(path,entry):
 entry=entry.rstrip('/')
 return path==entry or path.startswith(entry+'/')
def published(path):
 if any(matches(path,e) for e in include): return True
 if any(p[0] in '_.#~' for p in path.split('/')): return False
 return not any(matches(path,e) for e in exclude)
files=subprocess.check_output(['git','ls-files'],text=True).split()
served=[f for f in files if published(f)]
INTERNAL=['docs/seo/max-todo.md','docs/seo-geo/REPORT.md','docs/geo/testfragen.md','TODO.md',
 'og-banner.html','hausverwaltung/README.md','.github/workflows/seo-drift.yml',
 'scripts/check-llms-txt.py','_config.yml']
INTERNAL_DIRS=['docs/','audit/','evidence/','scripts/','.github/']
REQUIRED=['DESIGN.md','design.html','CNAME','robots.txt','sitemap.xml','llms.txt','llms-full.txt','index.html','style.css','main.js',
 'hausverwaltung/index.html','impressum.html','datenschutz.html','legal/index.html','assets/og-image.png']
errors=[]
if Path('.nojekyll').exists(): errors.append('.nojekyll exists: Jekyll is skipped and exclude has no effect')
for f in INTERNAL:
 if f in served: errors.append('internal file published: '+f)
for d in INTERNAL_DIRS:
 leaked=[f for f in served if f.startswith(d)]
 if leaked: errors.append(f'internal dir published: {d} ({len(leaked)} files)')
for f in REQUIRED:
 if f not in files: errors.append('required file missing in repo: '+f)
 elif f not in served: errors.append('required file not published: '+f)
for f in served:
 if f.endswith(('.md','.markdown')) and not (f == 'DESIGN.md' and 'markdown_ext: "markdown,mkdown,mkdn,mkd"' in cfg.splitlines()):
  errors.append('Markdown would be rendered by Jekyll: '+f)
 with open(f,'rb') as fh:
  if fh.read(4).startswith(b'---'): errors.append('front matter (Jekyll would render): '+f)
if '--built' in sys.argv:
 site=Path(sys.argv[sys.argv.index('--built')+1])
 built=sorted(str(f.relative_to(site)) for f in site.rglob('*') if f.is_file())
 for f in sorted(set(built)-set(served)): errors.append('built but not predicted: '+f)
 for f in sorted(set(served)-set(built)): errors.append('predicted but not built: '+f)
 for f in sorted(set(built)&set(served)):
  if (site/f).read_bytes()!=Path(f).read_bytes(): errors.append('Jekyll changed file: '+f)
 if not errors: print(f'built site matches: {len(built)} files, all byte-identical')
if '--list' in sys.argv:
 for f in served: print(f)
for e in errors: print('FAIL',e)
if errors: sys.exit(1)
print(f'pages ok: {len(served)} of {len(files)} tracked files published, {len(files)-len(served)} excluded; '
 f'exclude={exclude}')
