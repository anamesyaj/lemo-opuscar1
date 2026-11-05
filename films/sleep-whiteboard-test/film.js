// "8 HOURS, STILL TIRED?" — 20 s M1 Whiteboard test (9:16).
// Black marker + one red accent on warm white; marker pen draws everything stroke by stroke.
// Page contract: window.render(t), window.DUR, window.READY. Deterministic: seeded RNG only.
const W=1080,H=1920,FPS=24,DUR=20;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp01=x=>x<0?0:x>1?1:x;
const seg=(t,a,b)=>clamp01((t-a)/(b-a));
const easeIO=u=>u*u*(3-2*u);
const PAPER='#FBFAF7', INK='#1B1B1B', RED='#E5432B';

const canvas=document.getElementById('c'); canvas.width=W; canvas.height=H;
const ctx=canvas.getContext('2d');
// faint eraser smudges (fixed seed)
const paper=document.createElement('canvas'); paper.width=540; paper.height=960;
{const p=paper.getContext('2d'),R=mulberry32(42);
 p.fillStyle=PAPER;p.fillRect(0,0,540,960);
 for(let i=0;i<14;i++){p.fillStyle=`rgba(150,150,150,${0.03+R()*0.03})`;
   p.save();p.translate(R()*540,R()*960);p.rotate(R()*3);
   p.fillRect(-20-R()*70,-8,40+R()*140,16);p.restore();}}

const J=(seed,i,amp)=>{const R=mulberry32(seed*1000+i*37);return (R()-0.5)*2*amp;};
// stroke: {pts:[[x,y]..], t0,t1, color, w, seed}
const STROKES=[];
function stroke(pts,t0,t1,color,w,seed){STROKES.push({pts,t0,t1,color:color||INK,w:w||10,seed:seed||STROKES.length+1});}
function circle(cx,cy,r){const p=[];for(let a=0;a<=12;a++){const t=a/12*Math.PI*2;p.push([cx+Math.cos(t)*r,cy+Math.sin(t)*r]);}return p;}
function arc(cx,cy,r,a0,a1){const p=[];for(let i=0;i<=14;i++){const t=a0+(a1-a0)*i/14;p.push([cx+Math.cos(t)*r,cy+Math.sin(t)*r]);}return p;}

// ---- bed scene (black) ----
stroke([[140,790],[140,470]],2.5,2.9);                       // headboard
stroke([[140,620],[940,620]],2.9,3.4);                       // mattress top
stroke([[140,700],[940,700]],3.4,3.8);                       // mattress bottom
stroke([[200,700],[200,800]],3.8,4.0); stroke([[880,700],[880,800]],4.0,4.2); // legs
stroke([[300,620],[300,565],[420,565],[420,620]],4.2,4.7);   // pillow
stroke([[420,620],[520,585],[620,620],[720,585],[820,620],[940,620]],4.7,5.4); // blanket wave
stroke(circle(360,505,48),5.4,6.0);                          // sleeper head
stroke(arc(860,400,70,Math.PI*0.7,Math.PI*1.9),6.0,6.5);      // moon outer
stroke(arc(885,390,55,Math.PI*0.75,Math.PI*1.85),6.5,6.9);    // moon inner
stroke([[470,430],[510,430],[470,470],[510,470]],6.9,7.1);    // Z1
stroke([[545,390],[585,390],[545,430],[585,430]],7.1,7.3);    // Z2
// ---- 5 cycle humps (black) + red 90 labels ----
const humps=[];
for(let i=0;i<5;i++){const cx=150+80+i*160,pts=[];
  for(let k=0;k<=16;k++){const x=cx-70+140*k/16;pts.push([x,1150-Math.sin(Math.PI*k/16)*150]);}
  humps.push({cx,pts}); stroke(pts,7.6+i*1.0,8.4+i*1.0);}
const LABELS=[];
for(let i=0;i<5;i++){LABELS.push({x:150+80+i*160,y:1225,t0:8.4+i*1.0});}
// ---- alarm bell (red) ----
stroke(arc(840,1430,58,Math.PI,0),13.0,13.7,RED,11);          // dome
stroke([[772,1430],[908,1430]],13.7,14.0,RED,11);             // base
stroke(circle(840,1458,11),14.0,14.2,RED,9);                 // clapper
stroke(arc(840,1430,95,Math.PI*1.15,Math.PI*1.45),14.2,14.5,RED,8);
stroke(arc(840,1430,95,Math.PI*1.55,Math.PI*1.85),14.5,14.8,RED,8);
stroke([[790,1000],[940,1160]],15.2,15.7,RED,12);             // X over 5th hump
stroke([[940,1000],[790,1160]],15.7,16.2,RED,12);

function strokeLen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;}
function strokeAt(s,d){let acc=0;for(let i=1;i<s.pts.length;i++){const l=Math.hypot(s.pts[i][0]-s.pts[i-1][0],s.pts[i][1]-s.pts[i-1][1]);if(acc+l>=d){const u=(d-acc)/Math.max(1e-6,l);return[s.pts[i-1][0]+(s.pts[i][0]-s.pts[i-1][0])*u,s.pts[i-1][1]+(s.pts[i][1]-s.pts[i-1][1])*u];}acc+=l;}const p=s.pts[s.pts.length-1];return[p[0],p[1]];}
const LEN=STROKES.map(s=>strokeLen(s.pts));

function drawStroke(g,s,prog){
  const d=prog*LEN[STROKES.indexOf(s)];
  g.save();g.lineCap='round';g.lineJoin='round';
  for(let pass=0;pass<2;pass++){ // hand feel: two passes, second thinner+offset
    g.strokeStyle=s.color;g.globalAlpha=pass?0.5:0.93;g.lineWidth=pass?s.w*0.55:s.w;
    g.beginPath();let started=false,acc=0;
    const off=pass?1.5:0, ox=J(s.seed,999,off), oy=J(s.seed,998,off);
    for(let i=0;i<s.pts.length;i++){
      if(i>0)acc+=Math.hypot(s.pts[i][0]-s.pts[i-1][0],s.pts[i][1]-s.pts[i-1][1]);
      if(acc>d+1e-6)break;
      const x=s.pts[i][0]+J(s.seed,i,2.5)+ox, y=s.pts[i][1]+J(s.seed,i+500,2.5)+oy;
      if(!started){g.moveTo(x,y);started=true;}else g.lineTo(x,y);
    }
    if(started){const h=strokeAt(s,Math.min(d,LEN[STROKES.indexOf(s)]));g.lineTo(h[0]+J(s.seed,997,2.5)+ox,h[1]+J(s.seed,996,2.5)+oy);g.stroke();}
  }
  g.restore();
}
// pen position timeline
function penAt(t){
  let px=1180,py=2050,lift=1; // rest offscreen
  for(let i=0;i<STROKES.length;i++){const s=STROKES[i];
    if(t>=s.t0&&t<=s.t1){const h=strokeAt(s,easeIO(seg(t,s.t0,s.t1))*LEN[i]);return{h:[h[0],h[1]],lift:0};}
    if(t>s.t1){const e=s.pts[s.pts.length-1];px=e[0];py=e[1];lift=0;}
  }
  // travel between strokes
  for(let i=0;i<STROKES.length-1;i++){const a=STROKES[i],b=STROKES[i+1];
    if(t>a.t1&&t<b.t0){const u=easeIO(seg(t,a.t1,b.t0));
      const e=a.pts[a.pts.length-1];
      return{h:[e[0]+(b.pts[0][0]-e[0])*u, e[1]+(b.pts[0][1]-e[1])*u],lift:Math.sin(u*Math.PI)};}}
  if(t>18.8){const u=easeIO(seg(t,18.8,19.7));const e=STROKES[STROKES.length-1].pts.slice(-1)[0];
    return{h:[e[0]+(1180-e[0])*u,e[1]+(2050-e[1])*u],lift:u};}
  return{h:[px,py],lift};
}
function drawPen(g,x,y,lift){
  const L=330,ang=-Math.PI/3.1,ly=lift*60;
  g.save();g.translate(x,y-ly*0.3);g.rotate(ang+Math.PI/2);
  g.fillStyle='rgba(0,0,0,0.15)';g.beginPath();g.ellipse(40,60,80,18,0.3,0,7);g.fill();
  g.fillStyle=INK;rr(g,-22,-L,44,L-70,18);g.fill();
  g.fillStyle=RED;rr(g,-22,-L,44,52,14);g.fill();              // red cap band
  g.fillStyle='#3a3a3a';g.beginPath();g.moveTo(-22,-70);g.lineTo(22,-70);g.lineTo(9,-38);g.lineTo(-9,-38);g.closePath();g.fill();
  g.fillStyle='#111';g.beginPath();g.moveTo(-9,-38);g.lineTo(9,-38);g.lineTo(0,-26);g.closePath();g.fill();
  g.restore();
}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function markText(g,text,x,y,size,color,prog,seed,maxW){
  g.save();g.fillStyle=color;
  let fs=size;g.font=`800 ${fs}px 'Trebuchet MS','DejaVu Sans',sans-serif`;
  if(maxW){let tw=0;for(const ch of text)tw+=g.measureText(ch).width+fs*0.04;
    if(tw>maxW){fs=Math.floor(fs*maxW/tw);g.font=`800 ${fs}px 'Trebuchet MS','DejaVu Sans',sans-serif`;}}
  const n=text.length,show=Math.floor(clamp01(prog)*n+1e-6);let cx=x;
  for(let i=0;i<show&&i<n;i++){const ch=text[i],w=g.measureText(ch).width;
    g.save();g.translate(cx+w/2,y+J(seed,i,2));g.rotate(J(seed,i+300,0.035));g.fillText(ch,-w/2,0);g.restore();
    cx+=w+(ch===' ' ?fs*0.3:fs*0.04);}
  g.restore();
}

window.render=function(t){
  t=Math.max(0,Math.min(DUR,t));const g=ctx;
  g.drawImage(paper,0,0,W,H);
  markText(g,'8 HOURS, STILL TIRED?',120,210,72,INK,seg(t,0.3,2.0),7,840);
  for(const s of STROKES)drawStroke(g,s,easeIO(seg(t,s.t0,s.t1)));
  for(const L of LABELS)markText(g,'90',L.x-28,L.y,34,RED,seg(t,L.t0,L.t0+0.4),L.x|0);
  markText(g,"RHYTHM > HOURS",120,1700,88,INK,seg(t,16.5,18.5),77,840);
  const pen=penAt(t);
  if(t<19.8)drawPen(g,pen.h[0],pen.h[1],pen.lift);
};
window.DUR=DUR;window.render(0);window.READY=true;
