#!/usr/bin/env python3
"""Persist icons in local templates, generated bundles and complete port sources."""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app_icons import ensure_icon
root=Path(__file__).resolve().parents[1]
for folder in ['templates','examples','apps','ports']:
 for p in (root/folder).rglob('*.json'):
  if p.name in ('manifest.json','package.json','package-lock.json'):continue
  try:b=json.loads(p.read_text(encoding='utf-8'))
  except (ValueError,UnicodeError):continue
  if not isinstance(b,dict) or 'manifest' not in b or 'files' not in b:continue
  b=ensure_icon(b);p.write_text(json.dumps(b,ensure_ascii=False,indent=2),encoding='utf-8')
  if p.name=='bundle.json':(p.parent/'icon.svg').write_text(b['files']['icon.svg'],encoding='utf-8')
