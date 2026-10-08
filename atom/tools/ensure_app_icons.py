#!/usr/bin/env python3
"""Backfill icons in installed app folders without reinstalling or reordering apps."""
import sys,json,os
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app_icons import generate_icon,validate_svg,theme_glyph

def migrate(root):
 count=0
 for p in sorted(Path(root).iterdir()):
  if p.is_symlink() or not p.is_dir() or p.name.startswith('.'):continue
  m=p/'manifest.json'
  if m.is_symlink() or not m.is_file():continue
  data=json.loads(m.read_text(encoding='utf-8'));icon=p/'icon.svg'
  if icon.is_symlink():raise ValueError('icon symlink: '+p.name)
  valid=False
  if data.get('icon')=='icon.svg' and icon.exists() and icon.stat().st_size<=32768:
   try:validate_svg(icon.read_text(encoding='utf-8'));valid=True
   except ValueError:pass
  if valid:
   glyph=theme_glyph(icon.read_text(encoding='utf-8'))
   if glyph!=icon.read_text(encoding='utf-8'):icon.write_text(glyph,encoding='utf-8');count+=1
   continue
  icon.write_text(theme_glyph(generate_icon(data)),encoding='utf-8');data['icon']='icon.svg'
  temp=p/'.manifest-icon.tmp';temp.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8');os.replace(str(temp),str(m));count+=1
 return count
if __name__=='__main__':print('Icons created:',migrate(sys.argv[1]))
