// "INSIDE ONE SLEEP CYCLE" — 20 s L14 Exploded Teardown test (9:16).
// A 90-minute cycle ring, exploded into 4 labeled layers on one axis, then closed again.
// Page contract: window.render(t), window.DUR, window.READY. Deterministic: seeded RNG only.
const W=1080,H=1920,FPS=24,DUR=20;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp01=x=>x<0?0:x>1?1:x;
const seg=(t,a,b)=>clamp01((t-a)/(b-a));
const easeIO=u=>u<0.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
const INK='#F1EFE9', DIM='rgba(241,239,233,0.6)', ACC='#FF6B3D', MONO='"DejaVu Sans Mono",monospace';
const canvas=document.getElementById('c');canvas.width=W;canvas.height=H;
const ctx=canvas.getContext('2d');
// graphite sweep backdrop (precomputed)
const bg=document.createElement('canvas');bg.width=540;bg.height=960;
{const p=bg.getContext('2d'),gr=p.createRadialGradient(270,380,60,270,480,620);
 gr.addColorStop(0,'#34363a');gr.addColorStop(1,'#0d0e10');p.fillStyle=gr;p.fillRect(0,0,540,960);}

// segments of the 90-min cycle: [name, minutes, arc fraction]
const SEGS=[['LIGHT',35],['DEEP',25],['LIGHT',15],['DREAM',15]];
const CX=540,CY=920,RR=300;
let a0=-Math.PI/2;
const ARCS=SEGS.map(([name,min],i)=>{const f=min/90,a={name,min,a0,a1:a0+f*Math.PI*2,i};a0=a.a1;return a;});
const mid=a=>(a.a0+a.a1)/2;
function arcPt(a,ang,r){return[CX+Math.cos(ang)*(r||RR),CY+Math.sin(ang)*(r||RR)];}

function drawSeg(g,a,dy,active,t){
  const lw=96;
  g.save();g.translate(0,dy);
  // studio-lit donut segment: base + top-light sheen
  g.lineCap='butt';
  g.strokeStyle='#3E4046';g.lineWidth=lw;g.beginPath();g.arc(CX,CY,RR,a.a0,a.a1);g.stroke();
  const gr=g.createLinearGradient(CX-RR,CY-RR,CX+RR,CY-RR);
  gr.addColorStop(0,'#6a6d75');gr.addColorStop(0.5,'#a9adb6');gr.addColorStop(1,'#565861');
  g.strokeStyle=gr;g.lineWidth=lw-14;g.beginPath();g.arc(CX,CY,RR,a.a0,a.a1);g.stroke();
  if(active){g.strokeStyle=ACC;g.globalAlpha=0.9;g.lineWidth=10;
    g.beginPath();g.arc(CX,CY,RR+lw/2+8,a.a0,a.a1);g.stroke();g.globalAlpha=1;}
  g.restore();
}
function label(g,a,dy,side,prog){
  if(prog<=0)return;
  const m=mid(a),[px,py]=arcPt(a,m,RR+70);
  const lx=side<0?120:960, ly2=CY+dy;
  g.save();g.globalAlpha=clamp01(prog);
  g.strokeStyle=DIM;g.lineWidth=2;
  g.beginPath();g.moveTo(px,py+dy);g.lineTo(lx+(side<0?180:-180),ly2);g.stroke();
  g.fillStyle=ACC;g.beginPath();g.arc(px,py+dy,7,0,7);g.fill();
  g.textAlign=side<0?'left':'right';
  g.fillStyle=ACC;g.font=`700 30px ${MONO}`;g.fillText(`0${a.i+1}`,lx,ly2-34);
  g.fillStyle=INK;g.font=`600 40px 'DejaVu Sans',sans-serif`;g.fillText(a.name,lx,ly2+8);
  g.fillStyle=DIM;g.font=`500 30px ${MONO}`;g.fillText(`${a.min} MIN`,lx,ly2+48);
  g.restore();
}

window.render=function(t){
  t=Math.max(0,Math.min(DUR,t));const g=ctx;
  g.drawImage(bg,0,0,W,H);
  // camera: never stops — slow push + drift
  const z=1+0.09*seg(t,0,20), cxp=540+30*Math.sin(t*0.24), cyp=900-40*seg(t,0,20);
  g.save();g.translate(W/2,H/2);g.scale(z,z);g.translate(-cxp,-cyp);
  // title (fitted)
  g.fillStyle=INK;g.textAlign='center';
  let tfs=64;g.font=`800 ${tfs}px 'DejaVu Sans',sans-serif`;
  while(g.measureText('INSIDE ONE').width>860&&tfs>30){tfs-=4;g.font=`800 ${tfs}px 'DejaVu Sans',sans-serif`;}
  g.globalAlpha=clamp01(seg(t,0.2,1.2));
  g.fillText('INSIDE ONE',540,200);g.fillText('SLEEP CYCLE',540,200+(tfs+12));
  g.font=`500 30px ${MONO}`;g.fillStyle=DIM;
  if(t>1.0){g.globalAlpha=clamp01(seg(t,1.0,1.8));g.fillText('90 MINUTES · TAKEN APART',540,336);}
  g.globalAlpha=1;
  // ring assembly 0.8–3
  const asm=easeIO(seg(t,0.8,3.0));
  // explode 3.2–8 (staggered), hold, close 13–17 (bottom first)
  const ex=easeIO(seg(t,3.2,8.0)), cl=easeIO(seg(t,13.0,17.0));
  ARCS.forEach((a,i)=>{
    const stag=seg(t,3.2+i*0.55,4.6+i*0.55);           // explode stagger top-first
    const cstag=seg(t,13.0+(3-i)*0.7,14.2+(3-i)*0.7);  // close stagger bottom-first
    const dy=(stag*(1-cstag))*(i-1.5)*160;
    // traveling dot 8–13
    const dotP=seg(t,8.0,13.0), active=dotP>0&&Math.floor(dotP*4.999)===i&&dotP<1;
    drawSeg(g,{...a,a1:a.a0+(a.a1-a.a0)*asm},dy,active,t);
    label(g,a,dy,i%2?1:-1,seg(t,4.2+i*0.5,5.2+i*0.5)*(1-seg(t,13.5,14.5)));
  });
  // traveling dot along active segment
  const dp=seg(t,8.0,13.0);
  if(dp>0&&dp<1){const i=Math.min(3,Math.floor(dp*4)),a=ARCS[i];
    const stag=easeIO(seg(t,3.2+i*0.55,4.6+i*0.55)),dy=stag*(i-1.5)*160;
    const ang=a.a0+(a.a1-a.a0)*((dp*4)%1),[dx,dyy]=arcPt(a,ang,RR);
    g.save();g.fillStyle=ACC;g.shadowColor=ACC;g.shadowBlur=24;
    g.beginPath();g.arc(dx,dyy+dy,16,0,7);g.fill();g.restore();}
  // takeaway
  if(t>17.2){g.textAlign='center';g.fillStyle=ACC;g.font=`800 72px 'DejaVu Sans',sans-serif`;
    g.globalAlpha=clamp01(seg(t,17.2,18.2));g.fillText('× 5, EVERY NIGHT',540,1620);}
  g.restore();
};
window.DUR=DUR;window.render(0);window.READY=true;
