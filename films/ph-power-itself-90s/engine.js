// engine.js — Satellite Briefing technique: two canvases (WebGL2 imagery +
// 2D marks overlay), nested plate sampling in a shader, project/unproject,
// analyst grade, scan fronts, claim layer, whip blur.
// Deterministic: no Date.now, no Math.random in the render path.

export const W = 1080;
export const H = 1920;

const lerp = (a, b, s) => a + (b - a) * s;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => {
  const s = clamp((x - a) / (b - a), 0, 1);
  return s * s * (3 - 2 * s);
};

export class Camera {
  constructor(keys) { this.keys = keys; }
  // keys hold the look-at point; the camera subpoint sits
  // alt*tan(tilt) behind it along the heading.
  static of(k) {
    const tilt = k[4] * Math.PI / 180, head = k[5] * Math.PI / 180;
    const off = k[3] * Math.tan(tilt);
    return {
      lon: k[1], lat: k[2], alt: k[3], tilt, head,
      slon: k[1] - off * Math.sin(head) / (111.32 * Math.cos(k[2] * Math.PI / 180)),
      slat: k[2] - off * Math.cos(head) / 110.57,
    };
  }
  sample(t) {
    const K = this.keys;
    if (t <= K[0][0]) return Camera.of(K[0]);
    for (let i = 0; i < K.length - 1; i++) {
      const a = K[i], b = K[i + 1];
      if (t <= b[0]) {
        let s = (t - a[0]) / (b[0] - a[0]);
        s = s * s * s * (s * (s * 6 - 15) + 10); // smootherstep
        const k = [0,
          lerp(a[1], b[1], s),
          lerp(a[2], b[2], s),
          Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), s)),
          lerp(a[4], b[4], s),
          lerp(a[5], b[5], s)];
        return Camera.of(k);
      }
    }
    return Camera.of(K[K.length - 1]);
  }
}

// world (lon/lat) -> screen px. behind=true when the point is behind the camera.
// cam.slon/slat is the camera subpoint (nadir); cam.lon/lat is the look-at.
export function project(lon, lat, cam) {
  const tilt = cam.tilt, head = cam.head;
  const dx = Math.sin(tilt) * Math.sin(head);
  const dy = Math.sin(tilt) * Math.cos(head);
  const dz = -Math.cos(tilt);
  const rx = Math.cos(head), ry = -Math.sin(head), rz = 0;
  // up = right x d
  const ux = ry * dz - rz * dy, uy = rz * dx - rx * dz, uz = rx * dy - ry * dx;
  const kx = (lon - cam.slon) * 111.32 * Math.cos(cam.slat * Math.PI / 180);
  const ky = (lat - cam.slat) * 110.57;
  const kz = -cam.alt;
  const zf = kx * dx + ky * dy + kz * dz;
  if (zf <= 0.01) return { x: 0, y: 0, behind: true };
  const xr = kx * rx + ky * ry + kz * rz;
  const yu = kx * ux + ky * uy + kz * uz;
  const th = Math.tan((30 * Math.PI / 180) / 2);
  const aspect = W / H;
  const nx = xr / (zf * th * aspect);
  const ny = yu / (zf * th);
  return { x: (nx + 1) / 2 * W, y: (1 - ny) / 2 * H, behind: false };
}

const VS = `#version 300 es
in vec2 p; out vec2 v_uv;
void main(){ v_uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;

uniform float u_camLon,u_camLat,u_camAlt,u_camTilt,u_camHead,u_vfov,u_aspect,u_pxPerKm;
uniform sampler2D u_t0,u_t1,u_t2,u_t3,u_t4,u_t5,u_t6;
uniform vec4 u_b0,u_b1,u_b2,u_b3,u_b4,u_b5,u_b6;
uniform float u_f0,u_f1,u_f2,u_f3,u_f4,u_f5,u_f6;
uniform float u_grey;
uniform float u_nightOn,u_nightFront,u_nightSoft;
uniform float u_bloom;
uniform vec2 u_s0,u_s1,u_s2,u_s3,u_s4,u_s5,u_s6,u_s7;
uniform float u_plume,u_plumeFront;
uniform vec2 u_q0,u_q1,u_q2,u_q3;
uniform vec2 u_qA,u_qB;
uniform vec2 u_blurDll;
uniform float u_blurAmt;
uniform float u_scanLat,u_scanWidth,u_scanAmp;
uniform vec3 u_scanTint;

float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }

vec4 plate(sampler2D tx, vec4 bb, float fade, float lon, float lat){
  if(lon<bb.x||lon>bb.z||lat<bb.y||lat>bb.w) return vec4(0.);
  vec2 uv=vec2((lon-bb.x)/(bb.z-bb.x),(lat-bb.y)/(bb.w-bb.y));
  float f=min(smoothstep(0.,0.025,min(uv.x,1.-uv.x)),smoothstep(0.,0.025,min(uv.y,1.-uv.y)));
  return vec4(texture(tx,uv).rgb, f*fade);
}

vec3 dayComposite(float lon,float lat){
  vec4 b=plate(u_t0,u_b0,u_f0,lon,lat);
  // outside the mosaic: open-ocean colour (sampled from the plate), so the
  // feathered plate edge dissolves into sea instead of cutting to black
  vec3 col=mix(vec3(0.086,0.169,0.290),b.rgb,b.a);
  vec4 s;
  s=plate(u_t2,u_b2,u_f2,lon,lat); col=mix(col,s.rgb,s.a);
  s=plate(u_t3,u_b3,u_f3,lon,lat); col=mix(col,s.rgb,s.a);
  s=plate(u_t4,u_b4,u_f4,lon,lat); col=mix(col,s.rgb,s.a);
  s=plate(u_t5,u_b5,u_f5,lon,lat); col=mix(col,s.rgb,s.a);
  s=plate(u_t6,u_b6,u_f6,lon,lat); col=mix(col,s.rgb,s.a);
  return col;
}

vec3 analyst(vec3 c){
  float lum=dot(c,vec3(0.299,0.587,0.114));
  float g=lum/(1.0+0.35*max(lum-0.72,0.0));           // shoulder: whites stay below white
  vec3 cool=mix(vec3(0.030,0.045,0.060),vec3(0.62,0.64,0.65),smoothstep(0.02,0.80,g));
  cool=(cool-0.5)*1.06+0.5;                            // local contrast
  return mix(c,cool,u_grey);
}

float plumeG(vec2 km, vec2 site){
  vec2 d=km-site; return exp(-dot(d,d)/(2.0*2.8*2.8));
}

vec3 plumeLayer(vec3 col,float lon,float lat){
  if(u_plume<=0.001) return col;
  float clat=radians(u_qA.y);
  vec2 A=vec2(0.,0.);
  vec2 B=vec2((u_qB.x-u_qA.x)*111.32*cos(clat),(u_qB.y-u_qA.y)*110.57);
  vec2 P=vec2((lon-u_qA.x)*111.32*cos(clat),(lat-u_qA.y)*110.57);
  float along=clamp(dot(P-A,B-A)/max(dot(B-A,B-A),1e-6),-0.1,1.1);
  float reveal=1.0-smoothstep(u_plumeFront-0.03,u_plumeFront+0.03,along);
  vec2 S0=vec2((u_q0.x-u_qA.x)*111.32*cos(clat),(u_q0.y-u_qA.y)*110.57);
  vec2 S1=vec2((u_q1.x-u_qA.x)*111.32*cos(clat),(u_q1.y-u_qA.y)*110.57);
  vec2 S2=vec2((u_q2.x-u_qA.x)*111.32*cos(clat),(u_q2.y-u_qA.y)*110.57);
  vec2 S3=vec2((u_q3.x-u_qA.x)*111.32*cos(clat),(u_q3.y-u_qA.y)*110.57);
  float g=plumeG(P,S0)+plumeG(P,S1)+plumeG(P,S2)+plumeG(P,S3);
  g=clamp(g,0.,1.2);
  float cellKm=7.0/max(u_pxPerKm,1.0);                 // halftone: a few px at any zoom
  vec2 cell=fract(P/cellKm)-0.5;
  float r=0.10+0.30*clamp(g,0.,1.);
  float dotm=1.0-smoothstep(r-0.10,r+0.10,length(cell));
  float n=hash12(floor(P*2.5));
  float a=u_plume*reveal*dotm*clamp(g*1.25,0.,1.);
  vec3 amber=vec3(1.0,0.745,0.333)*(0.88+0.24*n);      // paper grain in the ink
  return mix(col,amber,clamp(a*0.9,0.,1.));
}

vec3 bloomLayer(vec3 col,float lon,float lat,float nightW){
  if(u_bloom<=0.001||nightW<=0.001) return col;
  float clat=radians(lat);
  float glow=0.;
  vec2 P=vec2(lon,lat);
  vec2 sites[8]; sites[0]=u_s0;sites[1]=u_s1;sites[2]=u_s2;sites[3]=u_s3;
  sites[4]=u_s4;sites[5]=u_s5;sites[6]=u_s6;sites[7]=u_s7;
  for(int i=0;i<8;i++){
    vec2 d=vec2((P.x-sites[i].x)*111.32*cos(clat),(P.y-sites[i].y)*110.57);
    float core=exp(-dot(d,d)/(2.0*6.0*6.0));      // bright centre, ~6 km
    float halo=exp(-dot(d,d)/(2.0*20.0*20.0));    // soft halo, ~20 km
    glow+=core*(0.35+0.85*u_bloom)+halo*0.38*u_bloom;
  }
  return col+vec3(1.0,0.72,0.30)*clamp(glow,0.,1.6)*nightW;
}

vec3 vignette(vec3 c, vec2 ndc){
  return c*(1.0-0.22*smoothstep(0.55,1.05,length(ndc)));
}

void main(){
  vec2 ndc=vec2(v_uv.x*2.-1.,(1.-v_uv.y)*2.-1.);
  float tilt=u_camTilt,head=u_camHead;
  vec3 d=vec3(sin(tilt)*sin(head),sin(tilt)*cos(head),-cos(tilt));
  vec3 right=vec3(cos(head),-sin(head),0.);
  vec3 up=cross(right,d);
  float th=tan(u_vfov*0.5);
  vec3 dir=normalize(d+right*(ndc.x*th*u_aspect)+up*(ndc.y*th));
  vec3 bg=vec3(0.086,0.169,0.290);
  if(dir.z>=-1e-4){ outColor=vec4(vignette(bg,ndc),1.); return; }
  float tt=u_camAlt/(-dir.z);
  float x=dir.x*tt, y=dir.y*tt;
  float lon=u_camLon+x/(111.32*cos(radians(u_camLat)));
  float lat=u_camLat+y/110.57;

  vec3 col=vec3(0.); float wsum=0.;
  for(int k=-2;k<=2;k++){
    float w=(k==0)?0.42:0.145;
    vec2 ll=vec2(lon,lat)+u_blurDll*(float(k)*u_blurAmt);
    col+=dayComposite(ll.x,ll.y)*w; wsum+=w;
  }
  col/=wsum;
  col=analyst(col);
  col=plumeLayer(col,lon,lat);
  float band=exp(-pow((lat-u_scanLat)/u_scanWidth,2.0));
  col+=u_scanTint*band*u_scanAmp;
  float nightW=u_nightOn*smoothstep(u_nightFront-u_nightSoft,u_nightFront+u_nightSoft,lat);
  vec4 ns=plate(u_t1,u_b1,u_f1,lon,lat);
  vec3 ncol=ns.a>0.? ns.rgb*1.55 : vec3(0.004,0.005,0.008);
  ncol=bloomLayer(ncol,lon,lat,nightW);
  col=mix(col,ncol,clamp(nightW,0.,1.));
  outColor=vec4(vignette(col,ndc),1.);
}`;

export class PlateRenderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, 'p');
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS))
      throw new Error('link: ' + gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    this.pr = pr;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(pr, i);
      this.u[info.name] = gl.getUniformLocation(pr, info.name);
    }
  }
  loadPlates(images, boxes) {
    // images: [img x7] in plate order; boxes: [[lonMin,latMin,lonMax,latMax] x7]
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const names = ['u_t0', 'u_t1', 'u_t2', 'u_t3', 'u_t4', 'u_t5', 'u_t6'];
    const bbn = ['u_b0', 'u_b1', 'u_b2', 'u_b3', 'u_b4', 'u_b5', 'u_b6'];
    images.forEach((img, i) => {
      const tx = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(this.u[names[i]], i);
      const b = boxes[i];
      gl.uniform4f(this.u[bbn[i]], b[0], b[1], b[2], b[3]);
    });
  }
  render(cam, S) {
    const gl = this.gl, u = this.u;
    gl.viewport(0, 0, W, H);
    const F = (n, v) => gl.uniform1f(u[n], v);
    F('u_camLon', cam.slon); F('u_camLat', cam.slat); F('u_camAlt', cam.alt);
    F('u_camTilt', cam.tilt); F('u_camHead', cam.head);
    F('u_vfov', 30 * Math.PI / 180); F('u_aspect', W / H);
    F('u_pxPerKm', H / (2 * cam.alt * Math.tan(15 * Math.PI / 180)));
    const fades = S.fades;
    for (let i = 0; i < 7; i++) F('u_f' + i, fades[i]);
    F('u_grey', S.grey);
    F('u_nightOn', S.nightOn); F('u_nightFront', S.nightFront); F('u_nightSoft', 1.6);
    F('u_bloom', S.bloom);
    S.bloomSites.forEach((s, i) => gl.uniform2f(u['u_s' + i], s[0], s[1]));
    F('u_plume', S.plume); F('u_plumeFront', S.plumeFront);
    S.plumeSites.forEach((s, i) => gl.uniform2f(u['u_q' + i], s[0], s[1]));
    gl.uniform2f(u.u_qA, S.plumeAxis[0][0], S.plumeAxis[0][1]);
    gl.uniform2f(u.u_qB, S.plumeAxis[1][0], S.plumeAxis[1][1]);
    gl.uniform2f(u.u_blurDll, S.blurDll[0], S.blurDll[1]);
    F('u_blurAmt', S.blurAmt);
    F('u_scanLat', S.scanLat); F('u_scanWidth', S.scanWidth); F('u_scanAmp', S.scanAmp);
    gl.uniform3f(u.u_scanTint, S.scanTint[0], S.scanTint[1], S.scanTint[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
