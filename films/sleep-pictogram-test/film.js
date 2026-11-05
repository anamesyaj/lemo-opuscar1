// "SLEEP IN SIX CARDS" — 20 s L38 Pictogram Motion test (9:16).
// Beat-locked flash cards: geometric pictograms, huge grotesk titles, chapter hues.
// Page contract: window.render(t), window.DUR, window.READY. Deterministic: seeded RNG only.
const W=1080,H=1920,FPS=24,DUR=20,BEAT=0.5;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp01=x=>x<0?0:x>1?1:x;
const seg=(t,a,b)=>clamp01((t-a)/(b-a));
const easeOut=u=>1-Math.pow(1-u,3);
function shade(hex,f){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;
  const t=f<0?0:255,p=Math.abs(f);const m=v=>Math.round(v+(t-v)*p);
  return `rgb(${m(r)},${m(g)},${m(b)})`;}
const canvas=document.getElementById('c');canvas.width=W;canvas.height=H;
const ctx=canvas.getContext('2d');

const CARDS=[
 {b0:0, b1:4,  hue:'#1F3A5F', title:'8 HOURS',    pose:'bed'},
 {b0:4, b1:10, hue:'#14707A', title:'5 CYCLES',   pose:'discs'},
 {b0:10,b1:16, hue:'#B97B1E', title:'90 MINUTES', pose:'clock'},
 {b0:16,b1:22, hue:'#4A3B8C', title:'DEEP SLEEP', pose:'sink'},
 {b0:22,b1:28, hue:'#B3372B', title:'ALARM!',     pose:'bell'},
 {b0:28,b1:40, hue:'#1F3A5F', title:'RHYTHM, NOT HOURS', pose:'wave'},
];
function cardAt(t){const b=t/BEAT;for(let i=0;i<CARDS.length;i++)if(b>=CARDS[i].b0&&b<CARDS[i].b1)return i;return CARDS.length-1;}

function pattern(g,hue,beat){
  g.fillStyle=shade(hue,-0.25);g.fillRect(0,0,W,H);
  const cell=180,R=mulberry32(7);
  const tones=[-0.45,-0.3,-0.15,0,0.12].map(f=>shade(hue,f));
  for(let ry=0;ry*cell<H+cell;ry++){
    const shift=((beat*(ry%2?1:-1))%6+6)%6; // rows jump on beats
    for(let rx=-1;rx*cell<W+cell*2;rx++){
      const x=((rx+shift)*cell)%(W+cell*2)-cell, y=ry*cell;
      const pick=R();
      g.fillStyle=tones[(R()*5)|0];
      if(pick<0.4){g.beginPath();g.arc(x+cell/2,y+cell/2,cell*0.42,0,7);g.fill();}
      else if(pick<0.6){g.beginPath();g.arc(x+cell/2,y+cell/2,cell*0.42,0,Math.PI);g.fill();}
      else if(pick<0.75){for(let k=0;k<3;k++){g.beginPath();g.arc(x+cell/2,y+cell/2,cell*(0.14+k*0.1),0,7);g.lineWidth=10;g.strokeStyle=g.fillStyle;g.stroke();}}
    }
  }
}
function limb(g,x1,y1,x2,y2,w,color){g.save();g.strokeStyle=color;g.lineWidth=w;g.lineCap='round';
  g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.restore();}
function pictogram(g,pose,cx,cy,S,fig,accent,enter){
  // enter 0..1: bands slide in from alternating sides
  const off=(1-easeOut(enter));
  g.save();g.translate(cx,cy+off*120);g.globalAlpha=clamp01(enter*1.5);
  g.fillStyle=shade(accent,0.25);g.beginPath();g.arc(0,0,S*1.35,0,7);g.fill(); // sun disc
  g.fillStyle=fig;
  const D=(dx,dy,r)=>{g.save();g.translate(dx*(1+off*(dx>0?1:-1)*0.8),dy);g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore();};
  const B=(x1,y1,x2,y2,w)=>{const m=(x1+x2)/2;limb(g,x1+off*(m>0?160:-160)*0.8,y1,x2+off*(m>0?160:-160)*0.8,y2,w,fig);};
  if(pose==='bed'){ // lying figure on mattress
    B(-S*0.9,S*0.35,S*0.9,S*0.35,S*0.32);            // mattress
    D(-S*0.62,S*0.02,S*0.24);                        // head on pillow
    B(-S*0.38,S*0.12,S*0.5,S*0.12,S*0.2);             // body
    B(-S*0.9,S*0.62,-S*0.9,S*0.95,S*0.14);B(S*0.9,S*0.62,S*0.9,S*0.95,S*0.14);
  }else if(pose==='discs'){for(let i=0;i<5;i++)D(-S*0.8+i*S*0.4,Math.sin(i*1.2)*S*0.15,S*0.2);}
  else if(pose==='clock'){g.lineWidth=S*0.14;g.strokeStyle=fig;g.beginPath();g.arc(0,0,S*0.7,0,7);g.stroke();
    B(0,0,0,-S*0.42,S*0.13);B(0,0,S*0.3,S*0.18,S*0.13);D(0,0,S*0.09);}
  else if(pose==='sink'){D(0,-S*0.5,S*0.24);B(0,-S*0.26,0,S*0.3,S*0.2);
    B(0,-S*0.1,-S*0.35,S*0.15,S*0.14);B(0,-S*0.1,S*0.35,S*0.15,S*0.14);
    B(0,S*0.3,-S*0.22,S*0.75,S*0.14);B(0,S*0.3,S*0.22,S*0.75,S*0.14);
    limb(g,S*0.62,-S*0.7,S*0.62,S*0.55,S*0.16,accent);
    g.save();g.fillStyle=accent;g.beginPath();g.moveTo(S*0.62,S*0.72);g.lineTo(S*0.44,S*0.44);g.lineTo(S*0.8,S*0.44);g.closePath();g.fill();g.restore();}
  else if(pose==='bell'){g.lineWidth=S*0.13;g.strokeStyle=fig;g.beginPath();g.arc(0,-S*0.1,S*0.5,Math.PI,0);g.stroke();
    B(-S*0.5,-S*0.1,S*0.5,-S*0.1,S*0.13);D(0,S*0.18,S*0.11);
    for(let i=0;i<6;i++){const a=Math.PI*(1.15+i*0.14);B(Math.cos(a)*S*0.75,Math.sin(a)*S*0.75- S*0.1,Math.cos(a)*S*0.95,Math.sin(a)*S*0.95-S*0.1,S*0.09);}}
  else if(pose==='wave'){for(let r=0;r<3;r++){g.lineWidth=S*0.13;g.strokeStyle=fig;g.beginPath();
    for(let i=0;i<=20;i++){const x=-S+i*(2*S/20),y=(r-1)*S*0.42+Math.sin(i/20*Math.PI*2)*S*0.22;
      i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}}
  g.restore();
}
function titleFit(g,text,maxW,base){let s=base;g.font=`900 ${s}px 'Arial Black','DejaVu Sans',sans-serif`;
  while(g.measureText(text).width>maxW&&s>40){s-=6;g.font=`900 ${s}px 'Arial Black','DejaVu Sans',sans-serif`;}return s;}

window.render=function(t){
  t=Math.max(0,Math.min(DUR,t));const g=ctx;
  const ci=cardAt(t),C=CARDS[ci],beat=Math.floor(t/BEAT);
  pattern(g,C.hue,beat);
  const fig='#F4EFE4', cream='#F4EFE4';
  // pictogram enters over first 2 beats of card
  pictogram(g,C.pose,540,640,210,fig,C.hue,seg(t,ci===0?0:C.b0*BEAT,(ci===0?0:C.b0*BEAT)+1.0));
  // title mask slide-up
  const tIn=easeOut(seg(t,C.b0*BEAT,C.b0*BEAT+0.35));
  g.save();g.beginPath();g.rect(60,1080,960,340);g.clip();
  const fs=titleFit(g,C.title,920,C.title.length>10?96:150);
  g.font=`900 ${fs}px 'Arial Black','DejaVu Sans',sans-serif`;
  g.fillStyle=cream;g.textAlign='center';g.textBaseline='middle';
  g.fillText(C.title,540,1250+(1-tIn)*260);
  g.restore();
  // HUD
  g.fillStyle=cream;g.font='600 30px "DejaVu Sans Mono",monospace';g.textAlign='left';
  g.globalAlpha=0.85;g.fillText('SLEEP · 20S TEST',60,80);
  g.textAlign='right';g.fillText(`0${ci+1} / 06`,1020,80);g.globalAlpha=1;
  // progress ticks
  for(let i=0;i<6;i++){const done=i<ci,cur=i===ci;
    g.fillStyle=done||cur?cream:'rgba(244,239,228,0.3)';
    g.fillRect(60+i*160,1820,cur?40:120,done||cur?26:12);}
  g.textAlign='left';g.globalAlpha=0.7;g.fillText('BEAT-LOCKED · 120 BPM',60,1770);g.globalAlpha=1;
};
window.DUR=DUR;window.render(0);window.READY=true;
