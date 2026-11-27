"""Build the GitHub Pages site from an allowlist: only explicitly allowed files are published.

Lists: scripts/pages-allowlist.txt (public) and scripts/pages-internal.txt (internal), one glob per line.
Checks (always):
 1. Every tracked file matches exactly one list. A new file in neither list fails (unknown file);
    a file in both lists fails (ambiguous).
 2. Every glob matches at least one tracked file (no stale entries).
 3. Every required public file is tracked and allowed.
 4. Public files are regular files (no symlinks, no submodules).
 5. No public path has a component that starts with "." (e.g. assets/.hidden.png).
Modes:
 --check          checks only (default)
 --out DIR        checks, then copy the public files unchanged into DIR
                  (DIR must be "_site*", a direct child of the repo root, and not tracked)
 --verify DIR     DIR (e.g. the Pages artifact or a Jekyll build) contains exactly the public files,
                  each byte-identical to the repo file
 --list           print public and internal files

Usage: python3 scripts/build-pages.py [--check] [--out _site] [--verify _site] [--list]   (exit 1 on failure)
"""
import re,shutil,subprocess,sys
from pathlib import Path
def globs(name):
 return [l.strip() for l in Path('scripts',name).read_text().splitlines() if l.strip() and not l.lstrip().startswith('#')]
def regex(glob):
 out='';i=0
 while i<len(glob):
  if glob.startswith('**/',i): out+='(?:.*/)?';i+=3
  elif glob.startswith('**',i): out+='.*';i+=2
  elif glob[i]=='*': out+='[^/]*';i+=1
  elif glob[i]=='?': out+='[^/]';i+=1
  else: out+=re.escape(glob[i]);i+=1
 return re.compile(out+r'\Z')
PUBLIC=globs('pages-allowlist.txt'); INTERNAL=globs('pages-internal.txt')
REQUIRED=['DESIGN.md','design.html','assets/design-system.css','CNAME','robots.txt','sitemap.xml','llms.txt','llms-full.txt','index.html','style.css','main.js',
 'hausverwaltung/index.html','impressum.html','datenschutz.html','legal/index.html','assets/og-image.png']
entries=[l.split(None,3) for l in subprocess.check_output(['git','ls-files','-s','-z'],text=True).split('\0') if l]
mode={e[3]:e[0] for e in entries}; files=sorted(mode)
def hits(path,lst): return [g for g in lst if regex(g).match(path)]
errors=[]; public=[]; internal=[]
for f in files:
 p,i=hits(f,PUBLIC),hits(f,INTERNAL)
 if p and i: errors.append(f'in both lists: {f} (public {p}, internal {i})')
 elif p: public.append(f)
 elif i: internal.append(f)
 else: errors.append('unknown file (add it to scripts/pages-allowlist.txt or scripts/pages-internal.txt): '+f)
for name,lst in [('pages-allowlist.txt',PUBLIC),('pages-internal.txt',INTERNAL)]:
 for g in lst:
  if not any(regex(g).match(f) for f in files): errors.append(f'stale entry in {name}: {g} matches no tracked file')
for f in REQUIRED:
 if f not in public: errors.append('required public file missing or not allowed: '+f)
for f in public:
 if mode[f] not in ('100644','100755'): errors.append(f'public file is not a regular file (mode {mode[f]}): {f}')
 if any(c.startswith('.') for c in f.split('/')): errors.append('public path has a component starting with ".": '+f)
def arg(flag): return sys.argv[sys.argv.index(flag)+1] if flag in sys.argv else None
if not errors and arg('--out'):
 out=Path(arg('--out')); root=Path.cwd().resolve()
 if out.is_symlink() or out.resolve().parent!=root or not out.name.startswith('_site') or any(f==out.name or f.startswith(out.name+'/') for f in files):
  sys.exit(f'refusing output dir {out}: must be a direct child of the repo root, name must start with "_site", not tracked, no symlink')
 out=root/out.name
 if out.exists(): shutil.rmtree(out)
 for f in public:
  (out/f).parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(f,out/f)
 print(f'built {out}: {len(public)} public files')
if arg('--verify'):
 site=Path(arg('--verify'))
 if not site.is_dir(): errors.append(f'--verify: {site} is not a directory')
 else:
  built=sorted(str(p.relative_to(site)) for p in site.rglob('*') if p.is_file() or p.is_symlink())
  for f in sorted(set(built)-set(public)): errors.append(f'{site}: published but not allowed: {f}')
  for f in sorted(set(public)-set(built)): errors.append(f'{site}: allowed but missing: {f}')
  for f in sorted(set(built)&set(public)):
   if (site/f).is_symlink() or (site/f).read_bytes()!=Path(f).read_bytes(): errors.append(f'{site}: file differs from repo: {f}')
  if not errors: print(f'{site} matches the allowlist: {len(built)} files, all byte-identical')
if '--list' in sys.argv:
 for f in public: print('public  ',f)
 for f in internal: print('internal',f)
for e in errors: print('FAIL',e)
if errors: sys.exit(1)
print(f'pages allowlist ok: {len(files)} tracked files = {len(public)} public + {len(internal)} internal, 0 unknown')
