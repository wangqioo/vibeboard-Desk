# -*- coding: utf-8 -*-
"""Build four offline face companions from pinned upstream engines.
Prerequisite: sources in vendor/faces; clang wasm32 and Rust wasm-ld for RoboEyes.
"""
from pathlib import Path
import json,shutil,re,base64,subprocess,hashlib,os,sys
R=Path(__file__).resolve().parents[1];A=R/'face-adapters';V=R/'vendor/faces'
sys.path.insert(0,str(R))
from app_icons import ensure_icon
SPECS=[('robo-face','robo','机器人眼睛','原版 RoboEyes · 好奇、眨眼与情绪'),('kaia-face','kaia','表情星球','Kaia 的丰富表情 · 点击心动'),('pixel-companion','pixel','口袋小猫','Pixelpets · 抚摸、麻薯拉伸与蝴蝶'),('snappy-face','snappy','卡通伙伴','Snappy · 倾听、思考与卡通表情')]
ICONS=[ '<rect x="10" y="19" width="18" height="26" rx="7"/><rect x="36" y="19" width="18" height="26" rx="7"/>', '<circle cx="32" cy="32" r="23"/><path d="M17 28q5-7 10 0m10 0q5-7 10 0M23 40q9 8 18 0"/>', '<path d="M14 29 13 10l15 10h8l15-10-1 19q8 24-18 25Q6 53 14 29Z"/><path d="M21 32h2m18 0h2M29 39l3 3 3-3M10 38l-6-2m50 2 6-2"/>','<rect x="11" y="19" width="42" height="35" rx="14"/><path d="M32 19v-7m-11 20h3m16 0h3M23 43q9 8 18 0"/><circle cx="32" cy="8" r="4"/>']
for i,(id,source,title,desc) in enumerate(SPECS):
 p=R/'ports'/id;p.mkdir(exist_ok=True);s=V/source
 for f in ['common.css','common.js']:shutil.copy(A/f,p/f)
 shutil.copy(A/(source+'.js'),p/'main.js');shutil.copytree(s,p/'upstream-source',dirs_exist_ok=True)
 license='LICENSE.txt' if source=='robo' else 'LICENSE';shutil.copy(s/license,p/license)
 pin=json.loads((s/'PIN.json').read_text());(p/'UPSTREAM.txt').write_text('https://github.com/'+pin['repo']+'\nSHA '+pin['sha']+'\nSee PORT-NOTES.md for ATOM changes.\n')
 extra='';scripts='';stage='';controls='';hint=''
 if source=='robo':
  shutil.copy(A/'robo.cpp',p/'adapter.cpp');shutil.copy(s/'src/FluxGarage_RoboEyes.h',p/'FluxGarage_RoboEyes.h')
  subprocess.run(['clang','--target=wasm32','-O2','-nostdlib','-fno-exceptions','-fno-rtti','-c',str(p/'adapter.cpp'),'-o',str(p/'eyes.o')],check=True)
  linker=Path.home()/'.rustup/toolchains/stable-aarch64-apple-darwin/lib/rustlib/aarch64-apple-darwin/bin/gcc-ld/wasm-ld'
  linkenv=dict(os.environ);linkenv['DYLD_LIBRARY_PATH']=str(Path.home()/'.rustup/toolchains/stable-aarch64-apple-darwin/lib')
  subprocess.run([str(linker),'--no-entry','--allow-undefined','--export=__wasm_call_ctors']+['--export='+x for x in ['init','tick','mood','gaze','idle','action','sweat']]+[str(p/'eyes.o'),'-o',str(p/'eyes.wasm')],check=True,env=linkenv);(p/'eyes.o').unlink()
  stage='<canvas id="eyes"></canvas>';extra='#stage{background:#071216;display:flex;align-items:center;justify-content:center}#eyes{width:100%;height:auto}';hint='移动鼠标，它会看向你 · 点击逗它笑'
  controls='<div class="row"><select id="mood" aria-label="情绪"><option value="default">好奇</option><option value="happy">开心</option><option value="tired">困倦</option><option value="angry">生气</option></select><select id="color" aria-label="眼睛颜色"><option value="0">薄荷</option><option value="1">琥珀</option><option value="2">薰衣草</option></select></div><div class="row"><button id="laugh">大笑</button><button id="confused">困惑</button><button id="sweat">冒汗</button></div><div class="row"><button id="auto">自动情绪：开</button></div>'
  notes='GPL-3.0-or-later. Original header unchanged, compiled to WebAssembly with Canvas drawing imports and Arduino clock/random shim. 30fps 160x100 logical eyes, 3x display; pointer gaze, idle sleep, theme-aware controls; content colors selectable. No audio/network/model required.'
 elif source=='kaia':
  order=['helpers','animationModule','animationEffectModule','main','user_api','expression','expressionElement'];code='\n'.join((s/'src/js'/ (f+'.js')).read_text() for f in order)
  def embed(m):
   f=s/'src'/m.group(1);assert f.exists(),f
   return '"data:image/png;base64,'+base64.b64encode(f.read_bytes()).decode()+'"'
  code=re.sub(r'[\"\'](img/[a-zA-Z0-9_./-]+)[\"\']',embed,code)
  code=re.sub(r'Face\s*=\s*ExprElem\._Face', 'face = ExprElem._Face',code)
  code=code.replace('Date.now() - _t_ > 10','Date.now() - _t_ > 32')
  (p/'engine.js').write_text(code);shutil.copy(V/'fabric/fabric.js',p/'fabric.js');shutil.copy(V/'fabric/LICENSE',p/'FABRIC-LICENSE')
  scripts='<script src="fabric.js"></script><script src="engine.js"></script>';stage='<div id="face"></div>';extra='#stage{display:flex;justify-content:center;align-items:center}#face{width:340px;height:340px}#face canvas{width:340px;height:340px}';hint='移动鼠标，眼睛跟随 · 点击送它一颗心'
  controls='<div class="row"><select id="mood" aria-label="表情"><option>正在准备表情</option></select></div><div class="row"><button id="wink">眨眼</button><button id="auto">自动表情：开</button></div>'
  notes='Apache-2.0 upstream Face engine and original expression images retained; image assets embedded as data URLs for offline opaque iframe compatibility. Fabric 1.7.22 MIT from npm, license included. Fix ExpressionElement local Face/face casing bug (upstream assumed a global face instance). Render capped near30fps, 340x340 face; pointer, automatic reel and sleep. No camera or model.'
 elif source=='pixel':
  for f in ['cat-sprite.js','cat-live.js']:shutil.copy(s/'site'/f,p/f)
  # Small-device pointer drag uses upstream sprite painter; keeps rest of engine intact.
  live=(p/'cat-live.js').read_text()
  live=live.replace("    const ctx = canvas.getContext('2d');", "    let atomDrag={active:false,x:0,y:0,sx:0,sy:0};\n    const ctx = canvas.getContext('2d');")
  live=live.replace("      if (state === 'GRAB')", """      if(atomDrag.active || Math.abs(atomDrag.x)+Math.abs(atomDrag.y)>1){
        if(!atomDrag.active){atomDrag.x*=.82;atomDrag.y*=.82;}
        ctx.save();ctx.translate(footX+atomDrag.x*.22,footY);ctx.scale(scale*(1+Math.abs(atomDrag.x)/280),scale*(1+Math.abs(atomDrag.y)/220));ctx.translate(-SW/2,-SH);
        drawCat(ctx,sitSprite,palRGB,{bob:0,blinking:false,look:smoothLook,eyeMode:'happy',blush:true});ctx.restore();return;
      }
      if (state === 'GRAB')""")
  live=live.replace("    function bind() {", """    function dragStart(e){if(rect&&zoneAt(e.clientX-rect.left,e.clientY-rect.top)){atomDrag.active=true;atomDrag.sx=e.clientX;atomDrag.sy=e.clientY;canvas.setPointerCapture(e.pointerId);}}
    function dragMove(e){if(atomDrag.active){atomDrag.x=clamp(e.clientX-atomDrag.sx,-100,100);atomDrag.y=clamp(e.clientY-atomDrag.sy,-80,80);}}
    function dragEnd(){atomDrag.active=false;}
    function bind() {
      canvas.addEventListener('pointerdown',dragStart);canvas.addEventListener('pointermove',dragMove);canvas.addEventListener('pointerup',dragEnd);canvas.addEventListener('pointercancel',dragEnd);""")
  live=live.replace("    function unbind() {", "    function unbind() {\n      canvas.removeEventListener('pointerdown',dragStart);canvas.removeEventListener('pointermove',dragMove);canvas.removeEventListener('pointerup',dragEnd);canvas.removeEventListener('pointercancel',dragEnd);")
  live=live.replace("_debug: () => ({ zone:", "_debug: () => ({ drag:{...atomDrag},zone:")
  (p/'cat-live.js').write_text(live)
  # Explicit coat avoids upstream's unguarded localStorage read in opaque iframe.
  scripts='<script src="cat-sprite.js"></script><script src="cat-live.js"></script>';stage='<canvas id="pet"></canvas><div id="caption"></div>';extra='#pet{width:480px;height:330px;position:absolute;bottom:0;left:0}#caption{position:absolute;top:25px;left:60px;right:60px;text-align:center;font:13px sans-serif;color:var(--muted)}.heart{position:absolute;color:#d56b79;pointer-events:none;font-size:22px;animation:heart 1.5s ease-out forwards}@keyframes heart{to{transform:translateY(-55px);opacity:0}}';hint='摸摸头 · 拖拽像麻薯 · 滚轮爬绳子'
  controls='<div class="row"><select id="coat" aria-label="猫咪花色"></select></div><div class="row"><button id="gift">送礼物</button><button id="butterfly">蝴蝶</button><button id="knead">踩奶</button></div><div class="row"><button id="sound">声音：关</button></div>'
  notes='MIT. Uses original PixelCatLive full cat renderer and behavior engine, not Electron overlay. 14 coats, pointer petting/stretching, butterfly, gift, keyboard kneading and wheel climbing. ATOM adds explicit pointer-captured mochi drag with eased recovery using original sprite painter, hearts and optional quiet synthesized chirp (not upstream full desktop audio). Dog renderer and OS hooks not included. No persist promise; upstream guarded storage write harmless in sandbox.'
 else:
  code=(s/'snappy.js').read_text();code=code.replace("'sleeping'];","'sleeping', 'love', 'surprised', 'sad', 'angry', 'excited', 'confused'];")
  (p/'engine.js').write_text(code);shutil.copy(s/'snappy.css',p/'snappy.css');shutil.copy(A/'snappy-extra.css',p/'snappy-extra.css')
  scripts='<script src="engine.js"></script>';stage='<div id="face"></div>';extra='#stage{display:flex;align-items:center;justify-content:center}';hint='看向鼠标 · 点击心动 · 闲置打瞌睡'
  controls='<div class="row"><select id="mood" aria-label="状态"></select></div><div class="row"><button id="speak">说话动画</button><button id="auto">自动状态：开</button></div>'
  notes='MIT original Snappy engine and CSS retained. Upstream code supports7 states despite README saying13; ATOM adds6 matching CSS states for actual13. Continuous pointer gaze, theme tokens, automatic sleep/reel. Speaking is visual animation only; no actual microphone/agent/TTS connection claimed.'
 css='<link rel="stylesheet" href="snappy.css"><link rel="stylesheet" href="snappy-extra.css">' if source=='snappy' else ''
 html='<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>'+title+'</title><link rel="stylesheet" href="common.css">'+css+'<style>'+extra+'</style></head><body><main id="stage">'+stage+'</main><button id="menu" aria-label="打开控制">···</button><section id="panel" class="atomtools" hidden><header>'+title+'<button id="close" aria-label="关闭控制">×</button></header>'+controls+'<p id="status">准备动画…</p><p>控制会自动隐藏 · 空格键返回桌面</p></section><div id="hint">'+hint+'</div><div id="error"></div><script src="common.js"></script>'+scripts+'<script src="main.js"></script></body></html>'
 (p/'index.html').write_text(html);icon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+ICONS[i]+'</svg>';(p/'icon.svg').write_text(icon)
 (p/'bundle.json').write_text(json.dumps({'manifest':{'id':id,'name':title,'description':desc,'entry':'index.html','icon':'icon.svg','theme_ui':'controls','layout':'fullscreen'},'files':{'index.html':html,'icon.svg':icon}},ensure_ascii=False,indent=2))
 normalized=ensure_icon(json.loads((p/'bundle.json').read_text()));(p/'bundle.json').write_text(json.dumps(normalized,ensure_ascii=False,indent=2));(p/'icon.svg').write_text(normalized['files']['icon.svg'])
 (p/'PORT-NOTES.md').write_text(notes+'\nControls hide after2.2s; right-click opens local panel, no document scrolling. Apps offline after install. New app append; Space via system bridge.\n')
 hashes=['%s  %s'%(hashlib.sha256(f.read_bytes()).hexdigest(),f.relative_to(p)) for f in sorted(p.rglob('*')) if f.is_file() and f.name!='SHA256SUMS'];(p/'SHA256SUMS').write_text('\n'.join(hashes)+'\n');print(id)
