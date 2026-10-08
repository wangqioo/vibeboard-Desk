#!/usr/bin/env python3
"""Offline ATOM port of the original shimmering-dots Canvas 2D engines."""
from pathlib import Path
import io,json,os,shutil,subprocess,zipfile
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[1]; source=ROOT/'vendor/dot-core'; dest=ROOT/'ports/dot-waves'
SHA='072370df144a2de5d2c5aa49f80eab48140d5721'
if not source.exists():
    with urlopen('https://codeload.github.com/m1ckc3s/shimmering-dots/zip/'+SHA,timeout=60) as response: archive=zipfile.ZipFile(io.BytesIO(response.read()))
    source.mkdir(parents=True)
    for item in archive.infolist():
        parts=Path(item.filename).parts[1:]
        if not parts: continue
        if '..' in parts: raise ValueError('unsafe source archive')
        target=source.joinpath(*parts)
        if item.is_dir(): target.mkdir(parents=True,exist_ok=True)
        else: target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(item))
dest.mkdir(parents=True,exist_ok=True)
shutil.copytree(source,dest/'source',dirs_exist_ok=True)
shutil.copy(source/'LICENSE',dest/'LICENSE')
core=(source/'src/components/PixelBackground.tsx').read_text()
core=core[core.index('export const PATTERNS'):core.index('type Props =')]
core+='\nexport {Pixel,getEffectiveSpeed,renderTwist,renderShimmer,spawnFloater,updateFloaters,drawFloaters,buildFieldCells,renderOrganic,renderAurora,renderMorph};\n'
(dest/'engine.ts').write_text(core)
node=os.environ.get('NODE_EXECUTABLE') or shutil.which('node') or '/Users/wq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
subprocess.run([node,'-e',"const fs=require('fs');const {stripTypeScriptTypes}=require('node:module');fs.writeFileSync(process.argv[2],stripTypeScriptTypes(fs.readFileSync(process.argv[1],'utf8'),{mode:'strip'}));",str(dest/'engine.ts'),str(dest/'engine.js')],check=True)
(dest/'index.html').write_text('''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>点阵波场</title><style>html,body{height:100%;width:100%;margin:0;overflow:hidden;font-family:sans-serif;background:#070707}#field{background:#070707;display:block;width:100%;height:calc(100% - 62px);touch-action:none}.hint{position:absolute;top:10px;left:12px;color:#b8c2cd;font-size:14px;pointer-events:none}.tools{height:62px;box-sizing:border-box;padding:10px;display:flex;align-items:center;gap:8px;background:var(--card,#20282d);color:var(--ink,#fff);border-top:1px solid var(--line,#414d55)}button,select{height:40px;border:1px solid var(--line,#52616b);border-radius:8px;background:var(--card,#263640);color:inherit;font:15px sans-serif;padding:0 9px;flex-shrink:0}select{width:118px}label{display:flex;align-items:center;gap:6px;font-size:14px;white-space:nowrap}input{width:74px;height:40px;accent-color:var(--accent,#8cbfdc)}button:focus-visible,select:focus-visible{outline:2px solid var(--accent,#9ccbe8)}</style></head><body><canvas id="field"></canvas><div class="hint" id="hint">点阵波场 · 波纹明暗沿网格传播</div><div class="tools"><select id="mode" aria-label="点阵模式"><option value="shimmer">涟漪点阵</option><option value="grid">网格闪烁</option><option value="twist">螺旋点阵</option><option value="organic">有机波场</option><option value="aurora">极光点阵</option><option value="morph">流变点阵</option><option value="displace">鼠标排斥</option></select><label>速度<input id="speed" aria-label="波动速度" type="range" min="20" max="180" value="100"></label><button id="pause">暂停</button><button id="reset">重置</button></div><script type="module" crossorigin="anonymous" src="app.js"></script></body></html>''')
(dest/'app.js').write_text('''import * as E from './engine.js';
const canvas=document.getElementById('field'),ctx=canvas.getContext('2d'),mode=document.getElementById('mode'),speed=document.getElementById('speed');
let width=480,height=298,pattern='shimmer',paused=false,scale=1,time=0,last=performance.now(),pixels=[],cells=[],fieldCells=[],floaters=[],forces=[],frameCount=0;
const grid={...E.GRID_DEFAULTS,gap:16,dotSize:4.5},shimmer={...E.SHIMMER_DEFAULTS,spacing:13,dotSize:3.5},twist={...E.TWIST_DEFAULTS,gap:14,dotSize:4},displace={...E.DISPLACE_DEFAULTS,count:140,emission:12};
const fields={organic:{...E.ORGANIC_DEFAULTS,dotSize:1.7},aurora:{...E.AURORA_DEFAULTS,dotSize:1.7},morph:{...E.MORPH_DEFAULTS,dotSize:1.7}};
function reset(){width=Math.floor(canvas.clientWidth);height=Math.floor(canvas.clientHeight);canvas.width=width;canvas.height=height;pixels=[];cells=[];fieldCells=[];floaters=[];forces=[];time=0;
 if(pattern==='grid'){for(let x=0;x<width;x+=grid.gap)for(let y=0;y<height;y+=grid.gap)pixels.push(new E.Pixel(width,height,ctx,x,y,['#6d7e8d','#879baa','#c0d0db'][Math.floor(Math.random()*3)],E.getEffectiveSpeed(grid.speed*scale,false),Math.random()*Math.hypot(width,height)*.5,grid.dotSize))}
 else if(pattern==='shimmer'){for(let row=0;row<=Math.floor(height/shimmer.spacing)+2;row++)for(let col=0;col<=Math.floor(width/shimmer.spacing)+2;col++){const hash=(Math.imul(row,73856093)^Math.imul(col,19349663))>>>0;cells.push({x:col*shimmer.spacing,y:row*shimmer.spacing,col,row,phase:((hash&255)/255)*Math.PI*2,freq:.7+((hash>>>8)&255)/255})}}
 else if(pattern==='twist'){for(let x=twist.gap/2;x<width;x+=twist.gap)for(let y=twist.gap/2;y<height;y+=twist.gap)cells.push({x,y})}
 else if(pattern==='displace'){for(let i=0;i<40;i++)floaters.push(E.spawnFloater(width,height,displace,time,Math.random()*2))}
 else{const base=pattern==='organic'?E.ORGANIC_GRID:pattern==='aurora'?E.AURORA_GRID:E.MORPH_GRID;fieldCells=E.buildFieldCells(width,height,base/fields[pattern].density)}
 document.getElementById('hint').textContent=pattern==='displace'?'鼠标排斥 · 移动鼠标推动粒子':'点阵波场 · 波纹明暗沿网格传播';
}
function animate(now){requestAnimationFrame(animate);let dt=Math.min(now-last,100);if(dt<33)return;last=now;if(paused||document.hidden)return;time+=dt/1000*scale;ctx.clearRect(0,0,width,height);
 if(pattern==='grid')pixels.forEach(p=>p.appear());else if(pattern==='shimmer')E.renderShimmer(ctx,cells,shimmer,time);else if(pattern==='twist')E.renderTwist(ctx,cells,twist,width,height,time);else if(pattern==='displace'){forces=forces.filter(f=>time-f.t<.3);E.updateFloaters(floaters,forces,displace,width,height,time,dt/1000*scale);E.drawFloaters(ctx,floaters,displace,time)}else{const p=fields[pattern];if(pattern==='organic')E.renderOrganic(ctx,fieldCells,p,time*p.speed);else if(pattern==='aurora')E.renderAurora(ctx,fieldCells,p,time*p.speed);else E.renderMorph(ctx,fieldCells,p,time*p.speed)}frameCount++;
}
canvas.onpointermove=canvas.onpointerdown=e=>{if(pattern==='displace'){const r=canvas.getBoundingClientRect();forces.push({x:e.clientX-r.left,y:e.clientY-r.top,t:time})}};
mode.onchange=()=>{pattern=mode.value;reset()};speed.oninput=()=>{scale=+speed.value/100;if(pattern==='grid')reset()};document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'继续':'暂停'};document.getElementById('reset').onclick=reset;
window.atomDots={getState:()=>({pattern,paused,frameCount,time,cells:cells.length||fieldCells.length||pixels.length,floaters:floaters.map(f=>({...f})),forces:forces.length})};new ResizeObserver(reset).observe(canvas);reset();requestAnimationFrame(animate);
''')
icon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="14" cy="18" r="2"/><circle cx="26" cy="14" r="3"/><circle cx="39" cy="18" r="4"/><circle cx="51" cy="25" r="2"/><circle cx="12" cy="32" r="3"/><circle cx="26" cy="30" r="5"/><circle cx="41" cy="34" r="3"/><circle cx="53" cy="40" r="2"/><circle cx="17" cy="48" r="2"/><circle cx="30" cy="47" r="3"/><circle cx="44" cy="50" r="2"/></svg>'
(dest/'icon.svg').write_text(icon)
manifest=dict(id='dot-waves',name='点阵波场',description='原版网格波动 · 七种点阵与鼠标排斥',entry='index.html',icon='icon.svg',layout='fullscreen',theme_ui='controls')
(dest/'bundle.json').write_text(json.dumps(dict(manifest=manifest,files={'index.html':(dest/'index.html').read_text(),'icon.svg':icon}),ensure_ascii=False))
(dest/'UPSTREAM.txt').write_text('https://github.com/m1ckc3s/shimmering-dots\nSHA '+SHA+'\nMIT, original Canvas2D engines retained; React wrapper replaced with bounded ATOM controls.\n')
