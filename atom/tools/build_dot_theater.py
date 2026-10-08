#!/usr/bin/env python3
"""Package the original published LedMatrix renderer and ATOM creative controls.
Offline build: original TypeScript and npm-compiled source are checked in.
"""
from pathlib import Path
import json,hashlib,sys
BASE=Path(__file__).resolve().parents[1]
PORT=BASE/'ports/dot-theater'
source=(PORT/'upstream-source/index.compiled.js').read_text()
(PORT/'led-matrix.js').write_text('/* sallar/led-matrix 1.0.1, MIT; see LICENSE. Unmodified compiled class in a browser export wrapper. */\n(function(){var exports={};\n'+source+'\nwindow.LedMatrix=exports.LedMatrix;})();\n')
(PORT/'UPSTREAM.txt').write_text('https://github.com/sallar/led-matrix\nSHA: 271d12ef40dae2cc2725fcbfd9ec990be3ff41fc\nnpm led-matrix 1.0.1 gitHead matches upstream SHA.\nOriginal source under upstream-source; compiled renderer class unchanged.\n')
files={}
for p in PORT.iterdir():
 if p.is_file() and p.name not in ('bundle.json','SHA256SUMS'):
  files[p.name]=p.read_text()
bundle={'manifest':{'id':'dot-theater','name':'点阵剧场','description':'原版 LedMatrix 渲染器 · 点阵绘画、多帧动画与文字跑马灯','entry':'index.html','icon':'icon.svg','layout':'fullscreen','theme_ui':'controls'},'files':files}
sys.path.insert(0,str(BASE))
from app_icons import ensure_icon
bundle=ensure_icon(bundle)
(PORT/'bundle.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2))
(PORT/'SHA256SUMS').write_text('\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(PORT)) for p in sorted(PORT.rglob('*')) if p.is_file() and p.name not in ('bundle.json','SHA256SUMS'))+'\n')
print('dot-theater',len(files),'files',len((PORT/'bundle.json').read_bytes()),'bytes')
