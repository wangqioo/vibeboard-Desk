from pathlib import Path
import shutil,json,re,subprocess
root=Path('atom/ports')
for src,id,name in [('water','water-pool','光影水池'),('paint','fluid-paint','颜料画室')]:
 p=root/id
 shutil.copytree(Path('atom/vendor')/src,p,ignore=shutil.ignore_patterns('.git'),dirs_exist_ok=True)
 if src=='water':
  s=(p/'main.js').read_text().replace('innerWidth - help.clientWidth - 20','innerWidth').replace("if (e.which == ' '.charCodeAt(0)) paused = !paused;","if (e.which == 'P'.charCodeAt(0)) paused = !paused;")
  (p/'main.js').write_text(s)
  h=(p/'index.html').read_text().replace('<img ','<img crossorigin="anonymous" ')
  extra='''<style>html,body{margin:0;height:100%;overflow:hidden}#help{display:none}#loading{right:0}canvas{display:block}.tools{position:fixed;bottom:12px;left:12px;display:flex;gap:8px;z-index:3}button{height:40px;background:#183545dc;color:white;border:1px solid #ffffff55;border-radius:8px;padding:0 14px;font:14px sans-serif}.label{position:fixed;left:14px;top:12px;z-index:3;color:white;font:13px sans-serif;text-shadow:0 1px 4px black;pointer-events:none}</style><div class="label">光影水池 · 拨动水面 / 拖动球体</div><div class="tools"><button onclick="paused=!paused;this.textContent=paused?'继续':'暂停'">暂停</button><button onclick="useSpherePhysics=!useSpherePhysics;this.textContent=useSpherePhysics?'重力：开':'重力：关'">重力：关</button><button onclick="for(var i=0;i<8;i++)water.addDrop(Math.random()*2-1,Math.random()*2-1,.04,.04)">雨滴</button></div>'''
  h=h.replace('</body>',extra+'</body>')
 else:
  s=(p/'paint.js').read_text().replace('var INITIAL_QUALITY = 1','var INITIAL_QUALITY = 0').replace('var INITIAL_PADDING = 100','var INITIAL_PADDING = 10').replace('var MIN_PAINTING_WIDTH = 300','var MIN_PAINTING_WIDTH = 100').replace('var PANEL_WIDTH = 300','var PANEL_WIDTH = 0').replace('var PANEL_HEIGHT = 580','var PANEL_HEIGHT = 0').replace('var COLOR_PICKER_LEFT = 20','var COLOR_PICKER_LEFT = -1000').replace('this.brushScale = 50','this.brushScale = 22').replace('event.keyCode === 32','event.keyCode === 16')
  start=s.index('        var panelBottom = this.canvas.height - PANEL_HEIGHT;');end=s.index('        //this.brushViewer.draw',start)
  s=s[:start]+'        this.needsRedraw = false;\n'+s[end:]
  (p/'paint.js').write_text(s)
  h=(p/'index.html').read_text();h=re.sub(r"\s*<link href='http://fonts[^>]+>",'',h)
  extra='''<style>html,body{margin:0;height:100%;overflow:hidden;font-family:sans-serif}#ui,#instructions,#footer{display:none!important}canvas{position:absolute;left:0;top:0}.tools{position:fixed;bottom:10px;left:12px;right:12px;display:flex;gap:6px;z-index:10}button{height:40px;border:1px solid #ffffff80;border-radius:8px;padding:0 10px;background:#23313be8;color:white;font:13px sans-serif}.color{width:36px;flex-shrink:0}.title{position:fixed;top:10px;left:14px;z-index:10;font:13px sans-serif;color:#25313b;pointer-events:none}</style><div class="title">颜料画室 · 拖动绘画 · 滚轮调笔刷</div><div class="tools"><button class="color" style="background:#ee3355" onclick="painter.brushColorHSVA=[.97,.85,1,.8]"></button><button class="color" style="background:#267be9" onclick="painter.brushColorHSVA=[.6,.85,1,.8]"></button><button class="color" style="background:#ffca28" onclick="painter.brushColorHSVA=[.13,.9,1,.8]"></button><button onclick="painter.brushScale=painter.brushScale===22?40:22;this.textContent=painter.brushScale===22?'细笔':'粗笔'">细笔</button><button onclick="painter.undo()">撤销</button><button onclick="painter.redo()">重做</button><button onclick="painter.clear()">清空</button></div>'''
  h=h.replace('</body>',extra+'</body>')
 h=h.replace('<script src=','<script crossorigin="anonymous" src=')
 (p/'index.html').write_text(h)
 manifest=dict(id=id,name=name,description='WebGL实时交互 · '+name,entry='index.html',layout='fullscreen')
 (p/'bundle.json').write_text(json.dumps(dict(manifest=manifest,files={'index.html':h}),ensure_ascii=False))
 (p/'UPSTREAM.txt').write_text('https://github.com/'+('evanw/webgl-water' if src=='water' else 'dli/paint')+'\n'+subprocess.check_output(['git','-C','atom/vendor/'+src,'rev-parse','HEAD']).decode())
# WebGL1 float-texture extensions are unavailable on the board; WebGL2 is supported.
for aid in ['water-pool','fluid-paint']:
 p=root/aid
 (p/'webgl2-compat.js').write_text(Path('atom/tools/webgl2-compat.js').read_text())
 h=(p/'index.html').read_text().replace('<head>','<head><script src="webgl2-compat.js"></script>')
 (p/'index.html').write_text(h)
 b=json.loads((p/'bundle.json').read_text());b['files']['index.html']=h
 (p/'bundle.json').write_text(json.dumps(b,ensure_ascii=False))
p=root/'water-pool'/'main.js';p.write_text(p.read_text().replace('var ratio = window.devicePixelRatio || 1;','var ratio = 0.8; // ATOM render scale; CSS stays fullscreen.'))
p=root/'water-pool'/'water.js';p.write_text(p.read_text().replace('new GL.Texture(256, 256','new GL.Texture(128, 128'))
p=root/'fluid-paint'/'brush.js';p.write_text(p.read_text().replace('var ITERATIONS = 20;','var ITERATIONS = 6; // Reduced brush constraint iterations on RK3566.'))
p=root/'fluid-paint'/'paint.js';p.write_text(p.read_text().replace('var MAX_BRISTLE_COUNT = 100;','var MAX_BRISTLE_COUNT = 48;').replace('resolutionScale: 1.0','resolutionScale: 0.75'))
