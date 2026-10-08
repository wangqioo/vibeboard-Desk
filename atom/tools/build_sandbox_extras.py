#!/usr/bin/env python3
"""Build offline ATOM ports from pinned upstream snapshots and the compiled Rust core."""
from pathlib import Path
import json,re,shutil,subprocess,io,zipfile,os
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[1]
V=ROOT/'vendor'; P=ROOT/'ports'
def upstream(repo,sha,dest):
    if dest.exists(): return
    with urlopen('https://codeload.github.com/'+repo+'/zip/'+sha,timeout=60) as response:
        archive=zipfile.ZipFile(io.BytesIO(response.read()))
    dest.mkdir(parents=True)
    for info in archive.infolist():
        parts=Path(info.filename).parts[1:]
        if not parts: continue
        if any(part in ('..','') for part in parts): raise ValueError('unsafe archive')
        target=dest.joinpath(*parts)
        if info.is_dir(): target.mkdir(parents=True,exist_ok=True)
        else:
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(info))
upstream('MaxBittker/sandspiel','9936e06b07a583aedfba9589c0cead2917f405fb',V/'sand-core')
upstream('amandaghassaei/OrigamiSimulator','7855983a613c879c171b2b1557f8cd102d2640cf',V/'fold-core')
cargo=V/'sand-core/crate/Cargo.toml'
cargo.write_text(cargo.read_text().replace('wasm-bindgen = "0.2"','wasm-bindgen = "=0.2.100"'))
mvp_target=V/'sand-core/crate/target-mvp'
wasm=mvp_target/'wasm32-unknown-unknown/release/sandtable.wasm'
if not wasm.exists():
    env=dict(os.environ);env['RUSTFLAGS']='-C target-feature=-reference-types,-multivalue,-bulk-memory'
    subprocess.run(['cargo','+1.81.0','build','--manifest-path',str(cargo),'--target','wasm32-unknown-unknown','--release','--target-dir',str(mvp_target)],env=env,check=True)
if not shutil.which('wasm-bindgen'): raise RuntimeError('Install wasm-bindgen-cli 0.2.100 and rustup target wasm32-unknown-unknown before building')


def finish(path,aid,name,description,repo,sha,icon):
    (path/'icon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg>')
    manifest=dict(id=aid,name=name,description=description,entry='index.html',layout='fullscreen',theme_ui='controls',icon='icon.svg')
    (path/'bundle.json').write_text(json.dumps(dict(manifest=manifest,files={'index.html':(path/'index.html').read_text(),'icon.svg':(path/'icon.svg').read_text()}),ensure_ascii=False))
    (path/'UPSTREAM.txt').write_text(repo+'\nSHA '+sha+'\nCore simulation retained; ATOM replaces controls and reduces default workload.\n')

p=P/'fold-lab'; shutil.copytree(V/'fold-core',p,dirs_exist_ok=True)
h=(p/'index.html').read_text()
h=re.sub(r'<script[^>]+src="https?://[^>]+></script>','',h)
h=re.sub(r'<script>\s*window.dataLayer.*?</script>','',h,flags=re.S)
h=h.replace('content="width=400"','content="width=device-width,initial-scale=1"')
h=re.sub(r'<script type="text/javascript" src=', '<script crossorigin="anonymous" type="text/javascript" src=',h)
h=h.replace('<head>','<head><script src="webgl2-compat.js"></script>')
compat=(ROOT/'tools/webgl2-compat.js').read_text().replace('\\\\','\\')
compat=compat.replace("s=s.replace(/\\btanh\\b/g,'atomTanh');","s=s.replace(/\\btranspose\\b/g,'atomTranspose');s=s.replace(/\\btanh\\b/g,'atomTanh');")
(p/'webgl2-compat.js').write_text(compat)
extra='''<style>html,body{height:100%;width:100%;min-width:0!important;margin:0;overflow:hidden}body>nav,body>.navbar,#nav,#controls,#controlsLeft,#controlsRight,#basicUI,#controlsBottom,#controlsToggle,#bottomBar,#helper,#aboutCorner,#svgViewer,#creasePercentNav,#creasePercentBottom,.modal-backdrop,.modal{display:none!important}#threeContainer{position:absolute;inset:0}#threeContainer canvas{display:block}.atom-tools{position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;background:var(--card,#ffffffed);color:var(--ink,#22313a);padding:8px;border-radius:10px;display:flex;gap:8px;align-items:center;font:15px sans-serif}.atom-tools button,.atom-tools select{height:38px;font:15px sans-serif;border:1px solid var(--line,#b7c3ce);background:var(--card,#fff);color:inherit;border-radius:7px;padding:0 8px}.atom-tools label{display:flex;align-items:center;gap:6px;margin:0;white-space:nowrap}.atom-tools input{width:75px;height:35px}.atom-tools select{width:100px;min-width:100px}.atom-tools button{flex-shrink:0}.atom-tools{box-sizing:border-box}.atom-label{position:fixed;top:10px;left:12px;z-index:999;color:#31434d;font:14px sans-serif;pointer-events:none}#gpuMathCanvas{display:none}</style>
<div class="atom-label">折纸实验室 · 拖动旋转 / 滚轮缩放</div><div class="atom-tools"><select aria-label="折纸模型" onchange="globals.importer.importDemoFile(this.value)"><option value="SimpleFolds/simpleVertex.svg">四折顶点</option><option value="SimpleFolds/brochurefold.svg">折页</option><option value="Bases/waterbombBase.svg">水雷基础</option></select><label>折叠 <input aria-label="折叠程度" type="range" min="0" max="100" value="60" oninput="globals.creasePercent=this.value/100;globals.shouldChangeCreasePercent=true"></label><button onclick="globals.simulationRunning=!globals.simulationRunning;this.textContent=globals.simulationRunning?'暂停':'继续'">暂停</button><button onclick="globals.model.reset()">复位</button></div>'''
h=h.replace('</body>',extra+'</body>');(p/'index.html').write_text(h)
s=(p/'js/main.js').read_text(); start=s.index("    if (!getCookie('firsttime'))"); end=s.index('    globals = initGlobals();',start);s=s[:start]+s[end:];s=s.replace("'Tessellations/huffmanWaterbomb.svg'","'SimpleFolds/simpleVertex.svg'");(p/'js/main.js').write_text(s)
for js in (p/'js').rglob('*.js'):
    js.write_text(re.sub(r"^.*gtag\(.*?;\s*$",'',js.read_text(),flags=re.M))
csspath=p/'dependencies/flat-ui.min.css'
csspath.write_text(re.sub(r'@font-face\s*\{[^}]*\}','',csspath.read_text()))
s=(p/'js/globals.js').read_text().replace('numSteps: 100','numSteps: 12');(p/'js/globals.js').write_text(s)
finish(p,'fold-lab','折纸实验室','真实弹性折纸求解 · 旋转与折叠','https://github.com/amandaghassaei/OrigamiSimulator','7855983a613c879c171b2b1557f8cd102d2640cf','<path d="M8 17 48 9 56 48 17 55Z M8 17 35 35 48 9 M17 55 35 35 56 48"/><path d="M35 35 48 48"/>')

p=P/'material-world';p.mkdir(parents=True,exist_ok=True)
subprocess.run(['wasm-bindgen',str(wasm),'--target','web','--out-dir',str(p),'--out-name','sand'],check=True)
shutil.copy(V/'sand-core/LICENSE',p/'LICENSE')
# Keep original Rust algorithms available beside compiled output for audit/rebuild.
shutil.copytree(V/'sand-core/crate/src',p/'source',dirs_exist_ok=True)
shutil.copy(cargo,p/'source/Cargo.toml')
shutil.copy(cargo.parent/'Cargo.lock',p/'source/Cargo.lock')
html='''<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden;background:#111820;font-family:sans-serif}canvas{width:100%;height:calc(100% - 60px);display:block;image-rendering:pixelated;touch-action:none}.tools{height:60px;box-sizing:border-box;display:flex;gap:6px;align-items:center;padding:8px;background:var(--card,#202b34);color:var(--ink,#fff)}button,select{height:40px;border:1px solid var(--line,#52616b);border-radius:8px;background:var(--card,#263640);color:inherit;font:15px sans-serif;padding:0 8px}#status{position:absolute;top:10px;left:10px;color:#fff;background:#17232acc;padding:6px;font-size:14px;pointer-events:none}</style><canvas id="world" width="160" height="100"></canvas><div id="status">材料世界 · 拖动放置材料</div><div class="tools"><select id="species" aria-label="材料"><option value="2">沙</option><option value="3">水</option><option value="6">火</option><option value="7">木</option><option value="16">油</option><option value="11">植物</option><option value="9">冰</option><option value="8">熔岩</option><option value="12">酸</option><option value="1">墙</option><option value="0">擦除</option></select><button id="brush">笔刷：小</button><button id="pause">暂停</button><button id="undo">撤销</button><button id="clear">清空</button></div><script type="module" src="app.js" crossorigin="anonymous"></script></html>'''
(p/'index.html').write_text(html)
(p/'app.js').write_text('''import init,{Universe} from './sand.js';
const c=document.getElementById('world'),ctx=c.getContext('2d'),status=document.getElementById('status');let universe,wasm,paused=false,brush=4,down=false,last=null;
const colors={0:[17,24,32],1:[140,150,162],2:[231,193,99],3:[66,145,227],4:[192,212,211],5:[185,88,232],6:[255,106,31],7:[132,91,51],8:[240,66,35],9:[170,225,248],11:[84,170,89],12:[194,220,53],13:[102,116,132],14:[159,136,98],15:[231,107,194],16:[72,63,49],17:[230,124,96],18:[190,95,136],19:[127,179,52]};
function paint(e){const r=c.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*160/r.width),y=Math.floor((e.clientY-r.top)*100/r.height),species=+document.getElementById('species').value; if(last){const dx=x-last[0],dy=y-last[1],steps=Math.max(Math.abs(dx),Math.abs(dy),1);for(let i=0;i<=steps;i++)universe.paint(Math.round(last[0]+dx*i/steps),Math.round(last[1]+dy*i/steps),brush,species)}else universe.paint(x,y,brush,species);last=[x,y]}
c.onpointerdown=e=>{if(!universe)return;universe.push_undo();down=true;last=null;c.setPointerCapture(e.pointerId);paint(e)};c.onpointermove=e=>{if(down)paint(e)};c.onpointerup=c.onpointercancel=()=>{down=false;last=null};
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'继续':'暂停'};document.getElementById('brush').onclick=e=>{brush=brush===4?9:4;e.target.textContent=brush===4?'笔刷：小':'笔刷：大'};document.getElementById('undo').onclick=()=>universe&&universe.pop_undo();document.getElementById('clear').onclick=()=>{if(universe){universe.push_undo();universe.reset()}};
function draw(){if(!paused)universe.tick();const cells=new Uint8Array(wasm.memory.buffer,universe.cells(),160*100*4),image=ctx.createImageData(160,100);for(let i=0;i<16000;i++){const col=colors[cells[i*4]]||[220,220,220],noise=(cells[i*4+1]-125)*.2;image.data[i*4]=col[0]+noise;image.data[i*4+1]=col[1]+noise;image.data[i*4+2]=col[2]+noise;image.data[i*4+3]=255}ctx.putImageData(image,0,0)}
init().then(result=>{wasm=result;universe=Universe.new(160,100);window.atomMaterial={universe,wasm};status.textContent='材料世界 · 沙水火木真实反应';setInterval(draw,50)}).catch(()=>status.textContent='材料引擎加载失败');
''')
finish(p,'material-world','材料世界','沙水火木真实反应 · 原版 Rust WASM','https://github.com/MaxBittker/sandspiel','9936e06b07a583aedfba9589c0cead2917f405fb','<path d="M9 16h46l-5 37H14Z M9 16l12 11 11-7 12 9 11-13"/><circle cx="24" cy="39" r="2"/><circle cx="39" cy="43" r="2"/><path d="M18 49h26"/>')
