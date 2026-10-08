/* System feedback uses the same GPL RoboEyes engine as the companion app. */
(function(global){'use strict';var bytes=null;
global.AtomCompanion=function(canvas,state){var live=true,raf=0,m=null,count=0,last=0,emotion='',g=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
canvas.width=320;canvas.height=200;
function palette(){var s=getComputedStyle(document.documentElement);return {bg:s.getPropertyValue('--bg').trim()||'#f3f0e8',ink:s.getPropertyValue('--ink').trim()||'#242622'};}
var colors=palette();g.scale(1.6,1.6);g.translate(20,12.5);
function rect(x,y,w,h,r,c){if(w<=0||h<=0)return;r=Math.max(0,Math.min(r,w/2,h/2));g.fillStyle=c?colors.ink:colors.bg;g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();g.fill();}
function fallback(){g.fillStyle=colors.bg;g.fillRect(-20,-13,200,126);rect(24,28,42,44,14,1);rect(86,28,42,44,14,1);canvas.dataset.engine='static-fallback';}
fallback();
function setState(s){state=s;canvas.dataset.state=s;canvas.setAttribute('aria-label',({listening:'正在倾听',thinking:'正在思考',success:'完成',speaking:'正在说话',error:'遇到问题',idle:'等待操作'})[s]||s);if(!m)return;var mood={listening:0,thinking:0,success:3,speaking:3,error:1,idle:0}[s]||0;m.mood(mood);m.sweat(0);m.idle(s==='thinking'?1:0);if(s==='listening')m.gaze(500,420);if(s==='success'&&emotion!==s&&!reduced)m.action(1);if(s==='error'&&emotion!==s&&!reduced)m.action(2);emotion=s;}
function frame(t){if(!live)return;if(!document.hidden&&t-last>=33){m.tick(t|0);if(state==='speaking'){g.fillStyle=colors.ink;g.beginPath();g.ellipse(80,89,8,4+Math.abs(Math.sin(t/90))*5,0,0,Math.PI*2);g.fill();}last=t;count++;canvas.dataset.frames=count;}raf=requestAnimationFrame(frame);}
var source=bytes||(bytes=fetch('/companion/eyes.wasm').then(function(r){if(!r.ok)throw Error('engine');return r.arrayBuffer();}).catch(function(e){bytes=null;throw e;}));
source.then(function(data){return WebAssembly.instantiate(data,{env:{clear:function(){g.fillStyle=colors.bg;g.fillRect(-20,-13,200,126);},rect:rect,triangle:function(x,y,x2,y2,x3,y3,c){g.fillStyle=c?colors.ink:colors.bg;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.lineTo(x3,y3);g.fill();},rand:function(n){return n>0?Math.floor(Math.random()*n):0;}}});}).then(function(result){if(!live)return;m=result.instance.exports;m.__wasm_call_ctors();m.init();m.idle(0);m.gaze(500,500);setState(state);canvas.dataset.engine='RoboEyes-WASM';if(reduced){for(var t=33;t<1500;t+=33)m.tick(t);}else raf=requestAnimationFrame(frame);}).catch(function(){if(live)fallback();});
return {setState:setState,destroy:function(){live=false;cancelAnimationFrame(raf);m=null;}};
};})(window);
