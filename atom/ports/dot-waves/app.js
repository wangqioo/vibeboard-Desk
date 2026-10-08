import * as E from './engine.js';
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
