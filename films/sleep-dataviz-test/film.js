// "ONE NIGHT OF SLEEP" — 20 s L40 Data Storytelling test (9:16).
// A hypnogram drawn mark by mark on cream paper by a red-blue pencil.
// Page contract: window.render(t), window.DUR, window.READY. Deterministic: seeded RNG only.
const W = 1080, H = 1920, FPS = 24, DUR = 20;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp01 = x => x<0?0:x>1?1:x;
const seg = (t,a,b) => clamp01((t-a)/(b-a));
const easeIO = u => u*u*(3-2*u);

// ---- palette (L40) ----
const PAPER='#F6F1E5', INK='#2B2118', GRID='#DCD2BC', FAINT='#E7DECB';
const BLUE='#2B5FA6', RED='#D33A2C', WOOD='#C99A5B';

// ---- layout ----
const PX0=210, PX1=990, PY_TOP=640, PY_BOT=1380;
const STAGE_Y=[720, 940, 1160, 1380];           // AWAKE, DREAM, LIGHT, DEEP
const STAGE_L=['AWAKE','DREAM','LIGHT','DEEP'];
const X = m => PX0 + (m/480)*(PX1-PX0);

// ---- hypnogram waypoints: [minutes from 22:00, stageIdx] ----
const WP=[[0,0],[10,2],[25,2],[40,3],[70,3],[85,2],[100,1],[115,2],[130,3],[160,3],[175,2],[190,1],[205,2],[220,3],[240,2],[250,1],[265,2],[280,2],[295,1],[310,2],[325,2],[340,1],[355,2],[370,2],[385,1],[400,2],[415,2],[430,2],[445,3],[480,3]];
function buildPath(){
  const pts=[{x:X(WP[0][0]), y:STAGE_Y[WP[0][1]]}];
  for(let i=1;i<WP.length;i++){
    const x1=X(WP[i][0]), y1=STAGE_Y[WP[i][1]], y0=STAGE_Y[WP[i-1][1]];
    pts.push({x:x1, y:y0});           // horizontal
    if(y1!==y0) pts.push({x:x1, y:y1}); // vertical step
  }
  const cum=[0];
  for(let i=1;i<pts.length;i++){const dx=pts[i].x-pts[i-1].x, dy=pts[i].y-pts[i-1].y;cum.push(cum[i-1]+Math.hypot(dx,dy));}
  return {pts, total:cum[cum.length-1], cum};
}
const PATH=buildPath();
function pathAt(d){ // point at distance d along path
  const {pts,cum,total}=PATH; d=Math.max(0,Math.min(total,d));
  let i=1; while(i<cum.length-1 && cum[i]<d) i++;
  const u=(d-cum[i-1])/Math.max(1e-6,cum[i]-cum[i-1]);
  return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*u, y:pts[i-1].y+(pts[i].y-pts[i-1].y)*u};
}

// ---- canvas setup ----
const canvas=document.getElementById('c'); canvas.width=W; canvas.height=H;
const ctx=canvas.getContext('2d');

// precomputed paper: cream + fibre noise + dot grid (fixed seed)
const paper=document.createElement('canvas'); paper.width=540; paper.height=960;
{
  const p=paper.getContext('2d'), R=mulberry32(1234);
  p.fillStyle=PAPER; p.fillRect(0,0,540,960);
  for(let i=0;i<2600;i++){ // fibre flecks
    p.fillStyle=`rgba(120,100,70,${0.02+R()*0.035})`;
    p.fillRect(R()*540, R()*960, 1+R()*2, 1);
  }
  p.fillStyle='rgba(90,80,60,0.16)';
  for(let gx=0;gx<=540;gx+=27) for(let gy=0;gy<=960;gy+=27){ p.fillRect(gx,gy,1.6,1.6); }
}

function handText(g, text, x, y, size, color, prog, seedBase, weight){
  g.save(); g.fillStyle=color; g.textBaseline='alphabetic';
  g.font=`italic ${weight||700} ${size}px Georgia,'DejaVu Serif',serif`;
  const n=text.length, show=Math.floor(clamp01(prog)*n+1e-6);
  let cx=x;
  for(let i=0;i<show && i<n;i++){
    const R=mulberry32(seedBase+i*97);
    const ch=text[i], wdt=g.measureText(ch).width;
    g.save(); g.translate(cx+wdt/2, y+(R()-0.5)*size*0.09); g.rotate((R()-0.5)*0.07);
    g.fillText(ch, -wdt/2, 0); g.restore();
    cx+=wdt + (ch===' ' ? size*0.28 : size*0.03);
  }
  g.restore();
  return cx;
}
function leader(g, x1,y1, x2,y2, color){ // wobbly leader + unclosed ring
  g.save(); g.strokeStyle=color; g.lineWidth=5; g.lineCap='round';
  const R=mulberry32(77+x1|0);
  g.beginPath(); g.moveTo(x1,y1);
  g.quadraticCurveTo((x1+x2)/2+(R()-0.5)*60, (y1+y2)/2+(R()-0.5)*60, x2,y2); g.stroke();
  g.beginPath(); g.arc(x2,y2,30,-0.4,Math.PI*1.55); g.stroke(); g.restore();
}
function drawPencil(g, tx, ty, lead /* 'blue'|'red' */, lift){
  // stylised red-blue hex pencil, tip at (tx,ty), body up-right. lift 0..1 raises it.
  const L=230, ang=-Math.PI/4.6, ly=lift*46;
  const bx=tx+Math.cos(ang)*L, by=ty+Math.sin(ang)*L - ly*0.4;
  const txx=tx, tyy=ty-ly;
  g.save();
  g.fillStyle='rgba(60,45,30,0.18)';           // shadow
  g.beginPath(); g.ellipse(txx+34, tyy+52, 70, 20, 0.3, 0, 7); g.fill();
  g.translate(txx,tyy); g.rotate(ang+Math.PI/2);
  const main=lead==='red'?RED:BLUE, other=lead==='red'?BLUE:RED;
  g.fillStyle=other; roundRect(g,-17,-L,17,L-64,7); g.fill();   // far half
  g.fillStyle=main;  roundRect(g,0,-L,17,L-64,7); g.fill();     // near half (active lead)
  g.fillStyle='rgba(255,255,255,0.25)'; g.fillRect(-17,-L,5,L-64);
  g.fillStyle=WOOD;                                          // wood cone
  g.beginPath(); g.moveTo(-17,-64); g.lineTo(17,-64); g.lineTo(0,-26); g.closePath(); g.fill();
  g.fillStyle=main==RED?'#7A1F16':'#1E3F73';                 // lead tip
  g.beginPath(); g.moveTo(-7,-36); g.lineTo(7,-36); g.lineTo(0,-22); g.closePath(); g.fill();
  g.restore();
}
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}

// alarm bolt path (precomputed points)
const BOLT=(()=>{const R=mulberry32(555),p=[];let x=X(480),y=PY_TOP-40;p.push({x,y});
  while(y<STAGE_Y[3]){x+=(R()-0.5)*90; y+=60+R()*70; p.push({x:Math.max(PX0+40,Math.min(PX1-20,x)),y});}
  const cum=[0]; for(let i=1;i<p.length;i++)cum.push(cum[i-1]+Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y));
  return {p,total:cum[cum.length-1],cum};})();
function boltAt(d){const{p,cum,total}=BOLT;d=Math.max(0,Math.min(total,d));let i=1;while(i<cum.length-1&&cum[i]<d)i++;
  const u=(d-cum[i-1])/Math.max(1e-6,cum[i]-cum[i-1]);return{x:p[i-1].x+(p[i].x-p[i-1].x)*u,y:p[i-1].y+(p[i].y-p[i-1].y)*u};}

// ---- camera: locked-off, one punch-in at the alarm ----
function camAt(t){
  let z=1, cx=W/2, cy=H/2;
  const p=seg(t,13.6,14.0);
  if(p>0){ // punch-in with decaying shake
    const hold=seg(t,14.0,15.8);
    z=1+0.13*easeIO(p)*(1-easeIO(hold));
    if(p<1){const s=(1-p)*10; cx+=(mulberry32(9)()-0.5)*s; cy+=(mulberry32(13)()-0.5)*s;}
    cx=540+(760-540)*easeIO(p)*(1-easeIO(hold));
    cy=960+(1050-960)*easeIO(p)*(1-easeIO(hold));
  }
  return {z,cx,cy};
}

window.render=function(t){
  t=Math.max(0,Math.min(DUR,t));
  const g=ctx;
  g.save();
  g.drawImage(paper,0,0,W,H);   // cream paper

  const cam=camAt(t);
  g.translate(W/2,H/2); g.scale(cam.z,cam.z); g.translate(-cam.cx,-cam.cy);

  // ---- title + kicker (0.2–2.2) ----
  handText(g,'ONE NIGHT OF SLEEP',110,170,60,INK,seg(t,0.2,1.6),11);
  g.save(); g.fillStyle=INK; g.font='600 34px "DejaVu Sans Mono",monospace';
  if(t>1.2){ g.globalAlpha=clamp01((t-1.2)/0.8); g.fillText('8 HOURS IN BED · 10 PM → 6 AM',124,238); }
  g.restore();

  // ---- axes (2.2–5.2) ----
  const axP=easeIO(seg(t,2.2,3.2));
  g.save(); g.strokeStyle=INK; g.lineWidth=6; g.lineCap='round';
  if(axP>0.001){ g.beginPath(); g.moveTo(PX0,PY_BOT); g.lineTo(PX0+(PX1-PX0)*axP, PY_BOT); g.stroke(); }
  const ayP=easeIO(seg(t,3.4,4.4));
  if(ayP>0.001){ g.beginPath(); g.moveTo(PX0,PY_BOT); g.lineTo(PX0, PY_BOT-(PY_BOT-PY_TOP)*ayP); g.stroke(); }
  g.restore();
  // ticks + time labels
  if(t>3.2){ g.save(); g.fillStyle=INK; g.font='600 27px "DejaVu Sans Mono",monospace'; g.textAlign='center';
    const labels=['10 PM','12 AM','2 AM','4 AM','6 AM'];
    for(let i=0;i<5;i++){const a=clamp01((t-3.2-i*0.12)/0.25); if(a<=0)continue;
      g.globalAlpha=a; const x=X(i*120);
      g.fillRect(x-3,PY_BOT,6,16); g.fillText(labels[i],x,PY_BOT+52);}
    g.restore(); }
  // stage labels
  if(t>4.2){ g.save(); g.fillStyle=INK; g.font='600 30px "DejaVu Sans Mono",monospace'; g.textAlign='right';
    for(let i=0;i<4;i++){const a=clamp01((t-4.2-i*0.1)/0.3); if(a<=0)continue;
      g.globalAlpha=a*0.75; g.fillText(STAGE_L[i],PX0-24,STAGE_Y[i]+11);}
    g.restore(); }
  // faint stage gridlines
  g.save(); g.strokeStyle=GRID; g.lineWidth=3;
  for(let i=0;i<4;i++){ g.globalAlpha=0.8*clamp01((t-3.4)/1); g.beginPath(); g.moveTo(PX0,STAGE_Y[i]); g.lineTo(PX1,STAGE_Y[i]); g.stroke(); }
  g.restore();

  // ---- hypnogram draw (5.4–13.0), pencil leads ----
  const hp=easeIO(seg(t,5.4,13.0));
  const head=pathAt(hp*PATH.total);
  if(hp>0.001){
    g.save(); g.strokeStyle=INK; g.lineWidth=9; g.lineJoin='round'; g.lineCap='round';
    g.beginPath();
    const upto=hp*PATH.total; let started=false;
    for(let d=0;d<=upto;d+=6){const p=pathAt(d); if(!started){g.moveTo(p.x,p.y);started=true;}else g.lineTo(p.x,p.y);}
    const e=pathAt(upto); g.lineTo(e.x,e.y); g.stroke(); g.restore();
  }
  // notes pinned while drawing
  if(t>6.4){ const p=seg(t,6.4,7.4);
    leader(g,430,1296,X(55),STAGE_Y[3]-8,BLUE);
    handText(g,'deep sleep',430,1300,36,BLUE,p,21); }
  if(t>8.2){ const p=seg(t,8.2,9.2);
    leader(g,560,862,X(100),STAGE_Y[1]+6,BLUE);
    handText(g,'dreaming (REM)',560,866,34,BLUE,p,22); }
  if(t>4.6){ handText(g,'your brain cycles ~ every 90 min',140,1548,35,BLUE,seg(t,4.6,5.8),23); }

  // ---- pencil: blue while drawing, flips red at 13.0–13.6 ----
  const flip=seg(t,13.0,13.6);
  const lead=flip>=1?'red':'blue';
  let px,py,lift=0;
  if(t<5.4){ // travels to path start
    const u=easeIO(seg(t,4.6,5.4)); px=1050+(X(0)-1050)*u; py=1830+(STAGE_Y[0]-1830)*u; lift=(1-u)*0.7;
  } else if(t<13.0){ px=head.x; py=head.y; }
  else if(t<13.6){ const u=easeIO(flip); px=head.x; py=head.y; lift=Math.sin(u*Math.PI)*1; }
  else if(t<15.8){ const b=boltAt(easeIO(seg(t,13.6,14.6))*BOLT.total); px=b.x; py=b.y; }
  else if(t<18.4){
    // pencil clears out to rest lower-left, then glides to the underline start and tracks it
    const u1=easeIO(seg(t,15.8,16.6));
    px=1050+(150-1050)*u1; py=1900+(1900-1900)*u1; lift=(1-u1)*0.5;
    if(t>=17.0){ const u2=easeIO(seg(t,17.0,17.4)); px=150+(140-150)*u2; py=1900+(1804-1900)*u2; lift=(1-u2)*0.3; }
    if(t>=17.4){ const u3=easeIO(seg(t,17.4,18.2)); px=140+640*u3; py=1804; lift=0; }
  }
  else { const u=easeIO(seg(t,18.4,19.4)); px=780+(1180-780)*u; py=1804+(2050-1804)*u; lift=u*0.8; }
  if(t<19.6) drawPencil(g,px,py,lead,lift);

  // ---- alarm: red bolt + ring + note (13.6–15.8) ----
  const bp=easeIO(seg(t,13.6,14.6));
  if(bp>0.001){
    g.save(); g.strokeStyle=RED; g.lineWidth=11; g.lineCap='round'; g.lineJoin='round';
    g.beginPath(); let st=false;
    for(let d=0;d<=bp*BOLT.total;d+=8){const p=boltAt(d); if(!st){g.moveTo(p.x,p.y);st=true;}else g.lineTo(p.x,p.y);}
    const e2=boltAt(bp*BOLT.total); g.lineTo(e2.x,e2.y); g.stroke();
    const rp=easeIO(seg(t,14.2,14.9));
    if(rp>0){ g.lineWidth=8; g.beginPath(); g.arc(X(480),STAGE_Y[3],52,-0.5,-0.5+rp*Math.PI*1.7); g.stroke(); }
    g.restore();
    handText(g,'the alarm shatters deep sleep',140,1630,40,RED,seg(t,14.2,15.4),31);
  }

  // ---- takeaway (15.8–18.2) ----
  const tp=seg(t,15.8,17.6);
  if(tp>0){ handText(g,"It's rhythm, not hours.",140,1770,56,INK,tp,41);
    const up=easeIO(seg(t,17.4,18.2));
    if(up>0.001){ g.save(); g.strokeStyle=RED; g.lineWidth=9; g.lineCap='round';
      g.beginPath(); g.moveTo(140,1804); g.lineTo(140+640*up,1804+Math.sin(up*9)*6); g.stroke(); g.restore(); } }

  // bottom band caption
  g.save(); g.fillStyle=INK; g.globalAlpha=0.55; g.font='600 24px "DejaVu Sans Mono",monospace'; g.textAlign='center';
  if(t>2.5) g.fillText('HYPNOGRAM · ONE ILLUSTRATIVE NIGHT', W/2, 1878);
  g.restore();

  g.restore(); // camera
};

window.DUR=DUR;
window.render(0);
window.READY=true;
