"""Local, inert SVG icons: every installed app carries its own visual identity."""
import hashlib,re,copy
import xml.etree.ElementTree as ET
from html import escape

GLYPHS={
 'breathe':'<path d="M20 38c-9-14 9-24 12-9 3-15 21-5 12 9-7 12-17 12-24 0Z"/>',
 'focus-studio':'<circle cx="32" cy="32" r="16"/><circle cx="32" cy="32" r="7"/><path d="M32 12v8M52 32h-8M32 52v-8M12 32h8"/>',
 'idea-card':'<path d="M25 42h14M27 48h10M24 36c-13-14 3-27 14-18 9 8 1 16 0 18v6H26v-6Z"/>',
 'local-music':'<circle cx="32" cy="32" r="19"/><circle cx="32" cy="32" r="10"/><circle cx="32" cy="32" r="2"/><path d="m47 16 5-3"/>',
 'particle-lab':'<ellipse cx="32" cy="32" rx="22" ry="9" transform="rotate(35 32 32)"/><ellipse cx="32" cy="32" rx="22" ry="9" transform="rotate(-35 32 32)"/><circle cx="32" cy="32" r="3"/>',
 'tea-brew-timer':'<path d="M17 28h26v9c0 15-26 15-26 0Z M43 30h4c10 0 8 12-4 12M15 49h31M24 22c-6-5 5-6 0-11M34 22c-6-5 5-6 0-11"/>',
 'template-info':'<rect x="17" y="15" width="30" height="37" rx="4"/><path d="M25 13h14v7H25zM24 29l3 3 5-6M35 30h6M24 40h17"/>',
 'template-music':'<path d="M28 39V19l20-4v20M28 22l20-4"/><ellipse cx="23" cy="42" rx="6" ry="4"/><ellipse cx="43" cy="38" rx="6" ry="4"/>',
 'template-playful':'<rect x="14" y="21" width="36" height="26" rx="9"/><path d="M32 21v-8M22 30v4M42 30v4M25 40h14M9 30v9M55 30v9"/><circle cx="32" cy="11" r="2"/>',
 'template-tool':'<path d="M19 21h26l-4 29H23ZM22 34c7-5 12 5 20 0M31 12v5M23 14l2 3M40 14l-2 3"/>',
 'water-counter-demo':'<path d="M32 11c-5 9-16 19-16 27 0 20 32 20 32 0 0-8-11-18-16-27ZM24 39c0 5 4 9 8 9"/>',
 'cosmic-window':'<circle cx="32" cy="32" r="13"/><ellipse cx="32" cy="32" rx="25" ry="8" transform="rotate(-25 32 32)"/><path d="M15 12v6M12 15h6M50 45v7M47 49h7"/>',
 'alien-creature':'<path d="M16 31c0-24 32-24 32 0ZM22 32c-11 12 8 9 1 20M31 32c-8 10 6 13 0 22M41 32c10 12-8 9-1 20"/><path d="M26 24v2M38 24v2"/>',
 'fluid-atlas':'<path d="M17 45c-17-24 23-40 26-21 3 14-26 20-25 8 0-8 13-17 20-8M22 49c8 8 26-4 25-15"/>',
 'planetarium':'<circle cx="32" cy="32" r="15"/><path d="M21 22c9 0 13 7 8 12s8 7 8 12M36 17l2 9 8 4M9 49l45-33"/>',
 'water-pool':'<path d="m14 32 18-11 18 11-18 11ZM14 32v11l18 11 18-11V32M32 43v11M20 33c7-6 17 6 24 0"/><circle cx="35" cy="29" r="5"/>',
 'fluid-paint':'<path d="m25 39 20-24 6 6-22 23ZM25 39c-12-3-7 14-15 14 13 2 20-3 19-9"/><path d="m39 22 7 7"/>',
 'volume-flow':'<path d="M12 38c9-25 12 25 21 0s10-3 18-11M13 26c10-21 10 21 22 0"/><circle cx="48" cy="40" r="4"/><circle cx="22" cy="49" r="3"/><circle cx="44" cy="16" r="2"/>',
 'living-pattern':'<path d="M16 18c16-12 11 20 22 11s18 2 11 12-17-2-23 5-17-1-11-9 11-5 9-12ZM37 17c-7 9 6 14 9 6M34 37c-5-7-12 2-6 6"/>',
 'moon-ocean':'<path d="M36 13c-17-3-21 21-4 23 6 0 10-4 11-8-11 3-16-6-7-15ZM11 44c7-7 14 7 21 0s14 7 21 0M11 52c7-7 14 7 21 0s14 7 21 0"/>',
 'physics-playground':'<path d="M11 52h42M15 30h15v15H15ZM36 15l13 22H25Z"/><circle cx="43" cy="44" r="8"/>',
 'pocket-studio':'<path d="M16 20v24M24 15v34M32 25v14M40 18v28M48 23v18"/><circle cx="16" cy="31" r="3"/><circle cx="24" cy="24" r="3"/><circle cx="32" cy="34" r="3"/><circle cx="40" cy="37" r="3"/><circle cx="48" cy="29" r="3"/>',
 'model-viewer':'<path d="m32 12 20 12v24L32 59 12 48V24ZM12 24l20 12 20-12M32 36v23M32 12v24M12 48l20-12 20 12"/>',
}
PALETTES=[('#233d50','#80c7dd'),('#433b61','#c7b2f0'),('#315746','#a6d6aa'),('#633f37','#f0ba93'),('#254e63','#a0dbe5'),('#56522e','#e5d59b')]
TAGS={'svg','g','path','rect','circle','ellipse','line','polyline','polygon','title','desc','defs','linearGradient','radialGradient','stop'}
ATTRS={'viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-opacity','fill-opacity','opacity','transform','id','offset','stop-color','stop-opacity','gradientUnits','gradientTransform'}
def validate_svg(text):
 if not isinstance(text,str) or len(text.encode('utf-8'))>32768 or re.search(r'<!|<\?',text):raise ValueError('icon must be a static SVG of at most 32 KiB')
 try:root=ET.fromstring(text)
 except ET.ParseError:raise ValueError('invalid icon SVG')
 if root.tag!='{http://www.w3.org/2000/svg}svg' or root.get('viewBox') is None:raise ValueError('icon SVG requires viewBox')
 try:
  box=[float(v) for v in root.get('viewBox').split()]
  if len(box)!=4 or not (box[2]>0 and box[3]>0):raise ValueError()
 except ValueError:raise ValueError('invalid icon viewBox')
 nodes=list(root.iter())
 if len(nodes)>256:raise ValueError('icon SVG too complex')
 for node in nodes:
  if node.tag.split('}')[-1] not in TAGS:raise ValueError('active SVG content forbidden')
  for key,value in node.attrib.items():
   if key.startswith('{') or key not in ATTRS or re.search(r'javascript:|data:|https?:|//|@',value,re.I):raise ValueError('unsafe icon attribute')
   if 'url(' in value and not re.fullmatch(r'url\(#[a-zA-Z][\w-]*\)',value):raise ValueError('external icon reference forbidden')
 return text

def generate_icon(manifest):
 aid=manifest['id'];seed=hashlib.sha256(aid.encode()).digest();bg,fg=PALETTES[seed[0]%len(PALETTES)];glyph=GLYPHS.get(aid)
 if not glyph:
  name=manifest.get('name','')+' '+manifest.get('description','')+' '+aid
  for words,key in [('音乐music歌音','template-music'),('水water饮','water-counter-demo'),('计时timer茶tea','tea-brew-timer'),('任务计划todo专注','focus-studio'),('画paint绘','fluid-paint'),('星planet宇宙','cosmic-window')]:
   if any(w and w in name.lower() for w in re.findall(r'[a-z]+|[\u4e00-\u9fff]',words)):glyph=GLYPHS[key];break
 if not glyph:
  # A distinct abstract emblem for a new category, never the shared plus-sign placeholder.
  glyph='<path d="M16 40 24 18 42 16 50 37 34 50Z"/><path d="M24 18 34 50 42 16M16 40h34"/><circle cx="%s" cy="%s" r="4"/>'%(23+seed[1]%18,23+seed[2]%18)
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>'+escape(manifest['name'])+'</title><rect width="64" height="64" rx="15" fill="'+bg+'"/><g transform="translate(5 5) scale(.84)" fill="none" stroke="'+fg+'" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">'+glyph+'</g><circle cx="54" cy="10" r="2" fill="'+fg+'" opacity=".65"/></svg>'

def ensure_icon(bundle):
 result=copy.deepcopy(bundle);m=result.get('manifest');files=result.get('files')
 if not isinstance(m,dict) or not isinstance(files,dict):return result
 if not isinstance(m.get('id'),str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,47}',m['id']) or not isinstance(m.get('name'),str):return result
 path=m.get('icon')
 if path is None:
  path='icon.svg';files[path]=generate_icon(m);m['icon']=path
 if path!='icon.svg' or path not in files:raise ValueError('manifest.icon must reference bundled icon.svg')
 files[path]=theme_glyph(files[path]);return result

def theme_glyph(text):
 """Turn a validated icon into a transparent, currentColor semantic glyph."""
 validate_svg(text);ET.register_namespace('', 'http://www.w3.org/2000/svg');root=ET.fromstring(text)
 box=[float(v) for v in root.get('viewBox').split()]
 first=next((n for n in root if n.tag.split('}')[-1] not in ('title','desc','defs')),None)
 if first is not None and first.tag.split('}')[-1]=='rect':
  try:
   if float(first.get('width','0'))>=box[2]*.85 and float(first.get('height','0'))>=box[3]*.85:
    root.remove(first)
    for n in list(root):
     if n.tag.split('}')[-1]=='circle' and n.get('cx')=='54' and n.get('cy')=='10' and n.get('r')=='2':root.remove(n)
  except ValueError:pass
 for parent in root.iter():
  for n in list(parent):
   if n.tag.split('}')[-1]=='defs':parent.remove(n)
 for n in root.iter():
  for key in ('fill','stroke'):
   if key in n.attrib and n.attrib[key]!='none':n.set(key,'currentColor')
  n.attrib.pop('stroke-width',None)
 root.set('fill','none');root.set('stroke','currentColor');root.set('stroke-width','2.4')
 return ET.tostring(root,encoding='unicode')
