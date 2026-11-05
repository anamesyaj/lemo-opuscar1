// "8 HOURS, MADE SOLID" — 20 s L13 Data Physicalization test (9:16).
// Real statistics as real objects: 1 oak block = 1 hour, brass rings = sleep cycles,
// a red wedge = the alarm. Studio sweep, long shadows.
// Page contract: window.render(t), window.DUR, window.READY. Deterministic: seeded RNG only.
const W=1080,H=1920,FPS=24,DUR=20;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp01=x=>x<0?0:x>1?1:x;
const seg=(t,a,b)=>clamp01((t-a)/(b-a));
const easeOut=u=>1-Math.pow(1-u,4);
const easeOutBack=u=>{const c=1.4;return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2);};
const INK='#1C1D20', ACC='#D4521C', MONO='"DejaVu Sans Mono",monospace';
const canvas=document.getElementById('c');canvas.width=W;canvas.height=H;
const ctx=canvas.getContext('2d');
// greige sweep backdrop
const bg=document.createElement('canvas');bg.width=540;bg.height=960;
{const p=bg.getContext('2d'),gr=p.createRadialGradient(270,700,80,270,960,900);
 gr.addColorStop(0,'#D8D3C8');gr.addColorStop(1,'#B3ADA0');p.fillStyle=gr;p.fillRect(0,0,540,960);}

const BX=i=>110+i*108, BW=100, BH=230, BY=1450; // block i: x, w, h, base y
function shadow(g,x,y,w,a){g.save();g.fillStyle=`rgba(40,32,24,${a})`;
  g.beginPath();g.ellipse(x,y,w/2+26,20,0,0,7);g.fill();g.restore();}
function block(g,i,yOff,cracked){
  const x=BX(i),y=BY+yOff;
  shadow(g,x+BW/2,BY+8,BW,0.28);
  const gr=g.createLinearGradient(x,0,x+BW,0);
  gr.addColorStop(0,'#C49A67');gr.addColorStop(0.5,'#D9B98A');gr.addColorStop(1,'#B0824F');
  g.fillStyle=gr;
  if(!cracked){rr(g,x,y-BH,BW,BH,10);g.fill();
    g.fillStyle='rgba(120,80,40,0.25)';
    const R=mulberry32(i*7+1);
    for(let k=0;k<3;k++){const gx=x+12+R()*(BW-24);g.fillRect(gx,y-BH+14,3,BH-28);}
    g.fillStyle='rgba(255,240,210,0.5)';g.fillRect(x,y-BH,BW,10); // top light
    g.fillStyle=INK;g.globalAlpha=0.55;g.font=`600 26px ${MONO}`;g.textAlign='center';
    g.fillText(`${i+1}`,x+BW/2,y-24);g.globalAlpha=1;
  }else{ // cracked: two tilted halves
    g.save();g.translate(x+BW/2,y);g.rotate(-0.1);
    g.fillStyle=gr;rr(g,-BW/2,-BH,BW/2-4,BH,10);g.fill();g.restore();
    g.save();g.translate(x+BW/2,y);g.rotate(0.12);
    g.fillStyle=gr;rr(g,4,-BH,BW/2-4,BH,10);g.fill();g.restore();
    const R=mulberry32(99);
    g.fillStyle='#A87F4E';
    for(let k=0;k<5;k++){const dx=(R()-0.5)*120,dy=-R()*160;
      g.save();g.translate(x+BW/2+dx,y+dy);g.rotate(R()*3);g.fillRect(-9,-6,18,12);g.restore();}
  }
}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function ring(g,i,prog){
  const x=BX(i)+BW/2,y=BY-BH+70;
  const drop=(1-easeOutBack(clamp01(prog)))*-560;
  const yy=y+drop, squash=prog>=1?0:Math.sin(clamp01(prog)*Math.PI)*6;
  shadow(g,x,BY+8,BW+60,0.2*clamp01(prog));
  const gr=g.createLinearGradient(x-70,0,x+70,0);
  gr.addColorStop(0,'#8A6A3A');gr.addColorStop(0.5,'#E8C886');gr.addColorStop(1,'#8A6A3A');
  g.save();g.strokeStyle=gr;g.lineWidth=24;
  g.beginPath();g.ellipse(x,yy,72,26+squash,0,0,7);g.stroke();g.restore();
}
function deepCap(g,i,prog){
  const x=BX(i),y=BY-BH;
  const yy=y-(1-easeOut(clamp01(prog)))*300;
  g.save();g.fillStyle='#4A3423';rr(g,x+6,yy-44,BW-12,44,8);g.fill();
  g.fillStyle='rgba(255,220,170,0.25)';g.fillRect(x+6,yy-44,BW-12,8);
  g.fillStyle='#F4EFE4';g.font=`600 22px ${MONO}`;g.textAlign='center';
  g.globalAlpha=clamp01(prog);g.fillText('DEEP',x+BW/2,yy-14);g.restore();
}

window.render=function(t){
  t=Math.max(0,Math.min(DUR,t));const g=ctx;
  g.drawImage(bg,0,0,W,H);
  const z=1+0.04*seg(t,0,20)-0.03*seg(t,16.5,20); // creep + slight pull-back
  g.save();g.translate(W/2,H/2);g.scale(z,z);g.translate(-540,-960);
  // title + rule
  g.textAlign='center';g.fillStyle=INK;
  g.font=`300 62px 'DejaVu Sans',sans-serif`;
  g.globalAlpha=clamp01(seg(t,0.2,1.4));g.fillText('8 HOURS, MADE SOLID',540,210);
  g.font=`500 30px ${MONO}`;g.globalAlpha=clamp01(seg(t,1.0,2.0))*0.7;
  g.fillText('1 BLOCK = 1 HOUR',540,278);g.globalAlpha=1;
  // walnut base
  const baseP=easeOut(seg(t,1.6,2.4));
  g.save();g.globalAlpha=baseP;
  const bgr=g.createLinearGradient(0,1450,0,1570);
  bgr.addColorStop(0,'#6B4A2E');bgr.addColorStop(1,'#4A3120');
  g.fillStyle=bgr;rr(g,90,1450,900,120,14);g.fill();
  g.fillStyle='rgba(244,239,228,0.5)';g.font=`500 24px ${MONO}`;g.textAlign='center';
  for(let h=0;h<=8;h++){const x=110+h*108-4;g.fillRect(x,1540,3,16);}
  g.restore();
  // 8 blocks cascade
  for(let i=0;i<8;i++){const p=seg(t,2.5+i*0.5,3.3+i*0.5);
    if(p<=0)continue;
    const cracked=i===7&&t>14.7;
    const yOff=(1-easeOutBack(clamp01(p)))*-620;
    if(!cracked){block(g,i,yOff,false);}
    else block(g,i,0,true);
  }
  // 5 brass rings onto blocks 1..5
  const cyc=[1,2,3,4,5];
  cyc.forEach((b,k)=>{const p=seg(t,6.5+k*0.9,7.4+k*0.9);if(p>0)ring(g,b,p);});
  g.fillStyle=INK;g.font=`500 30px ${MONO}`;g.textAlign='left';
  if(t>7.0){g.globalAlpha=clamp01(seg(t,7.0,7.6));g.fillText(`CYCLES  ${Math.max(1,Math.min(5,Math.ceil((t-6.5)/0.9)))} / 5`,110,1090);}
  g.globalAlpha=1;
  // deep caps on blocks 1,2,3
  [1,2,3].forEach((b,k)=>{const p=seg(t,11.2+k*0.5,11.9+k*0.5);if(p>0)deepCap(g,b,p);});
  // alarm wedge smashes block 7
  const wp=seg(t,13.5,14.6);
  if(wp>0&&wp<1){const y=200+easeOut(wp*wp)*1050;
    g.save();g.translate(0,0);
    const wgr=g.createLinearGradient(0,y-140,0,y);
    wgr.addColorStop(0,'#E86A3C');wgr.addColorStop(1,'#B03A1A');
    g.fillStyle=wgr;g.beginPath();
    const wx=BX(7)+BW/2;g.moveTo(wx-70,y-140);g.lineTo(wx+70,y-140);g.lineTo(wx,y);g.closePath();g.fill();
    g.fillStyle=INK;g.font=`700 34px ${MONO}`;g.textAlign='center';g.fillText('ALARM',wx,y-70);
    g.restore();}
  // verdict
  if(t>16.5){g.globalAlpha=clamp01(seg(t,16.5,17.5));
    g.fillStyle='rgba(244,239,228,0.88)';rr(g,110,1620,860,120,10);g.fill();
    g.fillStyle=ACC;g.fillRect(110,1620,860*easeOut(seg(t,16.8,17.8)),8);
    g.fillStyle=INK;g.font=`600 40px 'DejaVu Sans',sans-serif`;g.textAlign='center';
    g.fillText('THE ALARM BREAKS THE LAST CYCLE',540,1698);g.globalAlpha=1;}
  g.fillStyle=INK;g.globalAlpha=0.5;g.font=`500 22px ${MONO}`;g.textAlign='center';
  if(t>3)g.fillText('ILLUSTRATIVE NIGHT · NOT TO SCALE',540,1870);g.globalAlpha=1;
  g.restore();
};
window.DUR=DUR;window.render(0);window.READY=true;
