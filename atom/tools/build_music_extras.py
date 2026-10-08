#!/usr/bin/env python3
"""Rebuild offline music ports from the checked-in, attributed upstream files.
No npm install or network is required. The rhythm adapter keeps the upstream
Euclidean processor, event emission, Bjorklund algorithm and MIDI connectors;
its tiny WebAudio output and 480x360 controls are ATOM-specific.
"""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1]
ports=ROOT/'ports'
rhythm=ports/'rhythm-orbits'
src=rhythm/'upstream-source/src/js'
parts=['midi/connectorin.js','midi/connectorout.js','midi/processorbase.js','processors/epg/utils.js','processors/epg/processor.js']
core=['/* Derived from Music Pattern Generator; GPL-3.0-or-later. See LICENSE and upstream-source. */','(function(){"use strict";','const PPQN = 480; const STATE_CHANGE = "MPG_STATE_CHANGE";']
for relative in parts:
 text=(src/relative).read_text()
 text=re.sub(r'^import\s+.*?;\s*','',text,flags=re.M)
 text=text.replace('export default function ','function ').replace('export function ','function ')
 core.append('// Upstream: '+relative+'\n'+text)
core.append('window.MPGCore={createProcessor,getEuclidPattern,rotateEuclidPattern,PPQN};})();')
(rhythm/'upstream-core.js').write_text('\n'.join(core))
meta={
 'music-vision':dict(name='音乐幻境',description='Butterchurn / MilkDrop 原版 WebGL2 音乐视觉引擎，离线预设和本地音频',upstream='https://github.com/jberg/butterchurn',sha='d90f271be02969d8f16a3ed6b6960c971da6eff9',extra='butterchurn 2.6.7 npm release; butterchurn-presets 2.4.7 git d19bf03f8930e391a98cc502342ab7658a33af3c'),
 'rhythm-orbits':dict(name='节奏轨道',description='Music Pattern Generator 原版欧几里得节奏处理器，三轨 MIDI 事件驱动本地合成器',upstream='https://github.com/hisschemoller/music-pattern-generator',sha='2c2032d0744b00ad2105423bdd7160cf83d64cd4',extra='develop 2.3.0-beta; complete upstream src in upstream-source; code and LICENSE GPL-3.0-or-later (package metadata says LGPL-3.0)')
}
for app,m in meta.items():
 folder=ports/app
 (folder/'UPSTREAM.txt').write_text(m['upstream']+'\nSHA: '+m['sha']+'\n'+m['extra']+'\n')
 files={}
 for p in folder.rglob('*'):
  if not p.is_file() or 'upstream-source' in p.parts or p.name in ('bundle.json','SHA256SUMS'):continue
  if p.suffix in ('.html','.css','.js','.svg','.md','.txt') or p.name.startswith('LICENSE'):
   files[str(p.relative_to(folder))]=p.read_text()
 bundle=dict(manifest=dict(id=app,name=m['name'],description=m['description'],entry='index.html',icon='icon.svg',layout='fullscreen',theme_ui='controls'),files=files)
 (folder/'bundle.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2))
 sums=[]
 for p in sorted(folder.rglob('*')):
  if p.is_file() and p.name not in ('bundle.json','SHA256SUMS'):sums.append(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(folder)))
 (folder/'SHA256SUMS').write_text('\n'.join(sums)+'\n')
 print(app, len(files),'runtime text files;',len((folder/'bundle.json').read_bytes()),'bundle bytes')
