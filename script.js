/* ═══════════════════════════════════════════════════════════════
sumofDanth — SCENE ENGINE
8-beat scroll hero. Optimized redraw pipeline.
Lives: loader, smooth scroll, three.js katana, procedural
tree, cloud traverse, glass shatter, 2D hilltop,
dawn scene with silhouette, works grid, narrator.
═══════════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

/* ─── STATE ─── */
const S = {
scrollY:0, smooth:0, progress:0,
vw:innerWidth, vh:innerHeight, dpr:Math.min(devicePixelRatio||1, 1.75),
mx:innerWidth/2, my:innerHeight/2, nx:0, ny:0,
t:0, lt:0, dt:0,
fps:60, fpsT:0, fpsC:0,
modelReady:false,
dialogueIdx:-1,
shatterFired:false,
landCache:null,        // painted landscape cached
landCacheKey:null,     // scroll bucket we built it for
beat:0,                // current beat 0-7
lightning:[],          // active lightning arcs
lightningT:0,
};

/* ─── DIALOGUE SCRIPT ─── */
const DIALOGUE = [
{ at:0.04, who:‘SENSEI MUGEN’,
text:’<em>Hmm.</em> So you finally crossed the line. Sit down, traveler — the road is long, and the blade is older than your grandfather.’ },
{ at:0.11, who:‘SENSEI MUGEN’,
text:‘I am <strong>Mugen</strong>, ✦ keeper of unfinished worlds. This katana has cut the dreams of seventeen apprentices. Each returned home a craftsman.’ },
{ at:0.18, who:‘SENSEI MUGEN’,
text:‘But none — <em>none</em> — became a builder of worlds. Few inherit the will. Fewer still answer it.’ },
{ at:0.26, who:‘SENSEI MUGEN’,
text:‘Tell me, then. <strong>What world do you intend to build?</strong>’ },
{ at:0.33, who:‘sumofDanth’,
text:’<em>The one I cannot find on any map.</em>’ },
{ at:0.45, who:‘SENSEI MUGEN’,
text:‘Good. Then the blade goes with you. Through cloud. Through thunder. Through the breaking of this old world.’ },
{ at:0.62, who:‘SENSEI MUGEN’,
text:‘Every shard you see was once the shape of somebody else's dream. Step over them. The self is a hill with a sea behind it.’ },
{ at:0.85, who:‘SENSEI MUGEN’,
text:‘Now look up. The dawn does not arrive — it is <em>answered</em>. Go on, builder. 世界を創る者.’ },
];

/* ─── WORKS DATA (edit this list to change your showcase) ─── */
const WORKS = [
{ no:‘001’, year:‘2025’, title:‘Fudō Myōō’, role:‘Environment · Hard-Surface’, desc:‘A sanctum of still fire. Personal environment piece exploring Shingon iconography in rendered space.’, tags:[‘Blender’, ‘Substance’, ‘Cycles’], tint:‘linear-gradient(135deg, #ff4f36, #c8232c)’, span:‘wc-1’ },
{ no:‘002’, year:‘2025’, title:‘Midea · Brand Suite’, role:‘Graphic Design’, desc:‘Campaign design across five sub-brands. Canada, five months.’, tags:[‘Photoshop’, ‘Illustrator’], tint:‘linear-gradient(135deg, #3687ff, #0a2866)’, span:‘wc-2’ },
{ no:‘003’, year:‘2024’, title:‘Kōhaku’, role:‘3D · Concept’, desc:‘Silent koi. Studies in subsurface and lanternlight.’, tags:[‘Blender’, ‘ZBrush’], tint:‘linear-gradient(135deg, #f4ff1e, #a38e00)’, span:‘wc-3’ },
{ no:‘004’, year:‘2024’, title:‘KD Displays’, role:‘Retail Environments’, desc:‘Retail environment graphics and merchandising for Home Depot Canada lines.’, tags:[‘Figma’, ‘Illustrator’], tint:‘linear-gradient(135deg, #4dbf9d, #146848)’, span:‘wc-4’ },
{ no:‘005’, year:‘2024’, title:‘Onibi’, role:‘Hard-Surface’, desc:‘Wandering-flame lanterns. A small study in soft emissives.’, tags:[‘Blender’], tint:‘linear-gradient(135deg, #ff8800, #7a2e00)’, span:‘wc-5’ },
{ no:‘006’, year:‘2023’, title:‘Investohome’, role:‘Brand · Identity’, desc:‘Full identity system for a Toronto real-estate venture. Placement deliverable.’, tags:[‘Brand’, ‘Print’], tint:‘linear-gradient(135deg, #c8c2cf, #544d56)’, span:‘wc-6’ },
{ no:‘007’, year:‘2023’, title:‘The Iron Garden’, role:‘Environment’, desc:‘Coursework environment. Rust, cherry branches, rain memory.’, tags:[‘Unreal’, ‘Quixel’], tint:‘linear-gradient(135deg, #a399a8, #332633)’, span:‘wc-7’ },
];

/* ─── SCROLL ─── */
let scrollMax = 1;
function updateScrollMax(){
scrollMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);
}
window.addEventListener(‘scroll’, ()=>{ S.scrollY = window.scrollY; }, {passive:true});
window.addEventListener(‘resize’, ()=>{
S.vw = innerWidth; S.vh = innerHeight;
updateScrollMax();
R.setSize(S.vw, S.vh);
CAM.aspect = S.vw/S.vh; CAM.updateProjectionMatrix();
resizeCanvases();
invalidateLandCache();
});

/* ─── CANVASES ─── */
const bg = $(‘bg’), land = $(‘land’), fx = $(‘fx’), fg = $(‘fg’);
const bgx = bg.getContext(‘2d’),
lx  = land.getContext(‘2d’),
fxx = fx.getContext(‘2d’),
fgx = fg.getContext(‘2d’);

function resizeCanvases(){
const dpr = S.dpr;
[[bg,bgx],[land,lx],[fx,fxx],[fg,fgx]].forEach(([c,ctx])=>{
c.width  = innerWidth*dpr;
c.height = innerHeight*dpr;
ctx.setTransform(dpr,0,0,dpr,0,0);
});
}
resizeCanvases();

/* ─── THREE.JS ─── */
const R = new THREE.WebGLRenderer({
canvas:$(‘three’), antialias:true, alpha:true, powerPreference:‘high-performance’
});
R.setPixelRatio(S.dpr);
R.setSize(S.vw, S.vh);
R.toneMapping = THREE.ACESFilmicToneMapping;
R.toneMappingExposure = 1.0;
R.setClearColor(0x000000, 0);

const SC = new THREE.Scene();
SC.fog = new THREE.FogExp2(0x06080a, 0.022);

const CAM = new THREE.PerspectiveCamera(38, S.vw/S.vh, 0.01, 200);
CAM.position.set(0,0,5);

SC.add(new THREE.AmbientLight(0x1a1820, 0.65));
const keyL  = new THREE.DirectionalLight(0xffeedd, 1.55);
keyL.position.set(-3, 5, 4); SC.add(keyL);
const fillL = new THREE.DirectionalLight(0x402030, 0.5);
fillL.position.set(4, -1, 2); SC.add(fillL);
const rimL  = new THREE.DirectionalLight(0xff6644, 0.7);
rimL.position.set(0, -3, -4); SC.add(rimL);
const edgeAccent = new THREE.PointLight(0xff4f36, 0, 6);
edgeAccent.position.set(0, 0, 0.4); SC.add(edgeAccent);
const moonL = new THREE.DirectionalLight(0xaec4e8, 0);
moonL.position.set(3, 4, 2); SC.add(moonL);

const KAT = new THREE.Group();
SC.add(KAT);

/* ═══════════════════════════════════════════════════════════════
KATANA LOAD
═══════════════════════════════════════════════════════════════ */
const loader = new THREE.GLTFLoader();
loader.load(‘models/katana.glb’,
gltf => {
const m = gltf.scene;
const box = new THREE.Box3().setFromObject(m);
const sz = box.getSize(new THREE.Vector3());
const sc = 5.4 / Math.max(sz.x, sz.y, sz.z, .001);
m.scale.setScalar(sc);
const c = box.getCenter(new THREE.Vector3());
m.position.set(-c.x*sc, -c.y*sc, -c.z*sc);
const meshes = [];
m.traverse(o=>{
if(!o.isMesh) return;
const ms = Array.isArray(o.material) ? o.material : [o.material];
o.material = Array.isArray(o.material) ? ms.map(enhMat) : enhMat(ms[0]);
meshes.push(o);
});
KAT.add(m);
KAT.userData.model = m;
KAT.userData.meshes = meshes;
S.modelReady = true;
},
xhr => {
if(xhr.total > 0){
const p = xhr.loaded/xhr.total;
$(‘loader-bar’).style.width = (40 + p*50) + ‘%’;
$(‘loader-pct’).textContent = String(Math.round(40 + p*50)).padStart(3,‘0’) + ’ %’;
}
},
err => {
console.warn(‘katana.glb not found — using stand-in’);
// Stand-in: black blade + handle + tsuba
const blade = new THREE.Mesh(
new THREE.BoxGeometry(2.6, .085, .020),
new THREE.MeshStandardMaterial({color:0x080910, metalness:.96, roughness:.06})
);
const handle = new THREE.Mesh(
new THREE.CylinderGeometry(.055, .055, .82, 18),
new THREE.MeshStandardMaterial({color:0x1a0510, metalness:.4, roughness:.55})
);
handle.rotation.z = Math.PI/2; handle.position.x = -1.7;
const tsuba = new THREE.Mesh(
new THREE.CylinderGeometry(.16, .16, .035, 28),
new THREE.MeshStandardMaterial({color:0x4a2e1a, metalness:.7, roughness:.3})
);
tsuba.rotation.z = Math.PI/2; tsuba.position.x = -1.25;
const g = new THREE.Group();
g.add(blade, handle, tsuba);
KAT.add(g);
KAT.userData.model = g;
KAT.userData.meshes = [blade, handle, tsuba];
S.modelReady = true;
}
);
function enhMat(m){
const mat = m.clone();
if(!mat.emissive) mat.emissive = new THREE.Color(0,0,0);
const col = mat.color || new THREE.Color(1,1,1);
const b = (col.r+col.g+col.b)/3;
if(b < 0.18){ mat.metalness = 0.95; mat.roughness = 0.08; }
else if(b < 0.5){ mat.metalness = 0.7; mat.roughness = 0.25; }
mat.envMapIntensity = 1.8;
return mat;
}

/* ═══════════════════════════════════════════════════════════════
PROCEDURAL CHERRY-BLOSSOM TREE (SUMI-E)
Built ONCE into offscreen canvas; composited each frame.
═══════════════════════════════════════════════════════════════ */
let treeCanvas = null;
function buildTree(){
treeCanvas = document.createElement(‘canvas’);
treeCanvas.width = 1400;
treeCanvas.height = 1800;
const c = treeCanvas.getContext(‘2d’);

// Base: faded black wash
c.fillStyle = ‘rgba(0,0,0,0)’;
c.fillRect(0,0,1400,1800);

// Far-background ink wash (dark sumi-e background tint)
for(let i=0; i<8; i++){
const grd = c.createRadialGradient(700 + (Math.random()-.5)*400, 900 + (Math.random()-.5)*400, 10, 700, 900, 700);
grd.addColorStop(0, `rgba(${10+Math.random()*15}, ${5+Math.random()*10}, ${10+Math.random()*15}, .04)`);
grd.addColorStop(1, ‘rgba(0,0,0,0)’);
c.fillStyle = grd;
c.fillRect(0,0,1400,1800);
}

// Distant blossom haze (soft out-of-focus red specks)
for(let i=0; i<340; i++){
const x = Math.random()*1400, y = Math.random()*1800;
const r = 2 + Math.random()*5;
c.fillStyle = `rgba(${180+Math.random()*60}, ${25+Math.random()*35}, ${20+Math.random()*25}, ${.08+Math.random()*.14})`;
c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
}

/* branch() — sumi-e ink-brush stroke with layered passes:
1) wet-on-wet wide underlayer in warm grey
2) crisp dark midtone
3) highlight sliver
4) twigs at terminals
5) blossoms */
function branch(x, y, len, ang, w, depth, rng){
if(depth <= 0 || len < 5) return;

```
// two-segment bend for natural curve
const midAng = ang + (rng()-.5)*.4;
const midLen = len * .55;
const mx = x + Math.cos(midAng)*midLen;
const my = y + Math.sin(midAng)*midLen;
const ex = mx + Math.cos(ang + (rng()-.5)*.3)*(len - midLen);
const ey = my + Math.sin(ang + (rng()-.5)*.3)*(len - midLen);

// 1) wet underlayer — wider, soft
c.lineCap = 'round';
c.lineJoin = 'round';
c.strokeStyle = `rgba(120, 95, 70, ${.22 + depth*.02})`;
c.lineWidth = w * 1.9;
c.beginPath();
c.moveTo(x, y);
c.quadraticCurveTo(mx, my, ex, ey);
c.stroke();

// 2) midtone — pale beige-cream (matches reference painting)
const g = c.createLinearGradient(x, y, ex, ey);
g.addColorStop(0, `rgba(232, 212, 178, ${.82 - depth*.03})`);
g.addColorStop(.5, `rgba(210, 184, 146, ${.78 - depth*.03})`);
g.addColorStop(1, `rgba(182, 152, 112, ${.72 - depth*.03})`);
c.strokeStyle = g;
c.lineWidth = w;
c.beginPath();
c.moveTo(x, y);
c.quadraticCurveTo(mx, my, ex, ey);
c.stroke();

// 3) dark ink accent — thin edge line
c.strokeStyle = `rgba(45, 22, 10, ${.5 - depth*.015})`;
c.lineWidth = Math.max(.6, w*.22);
c.beginPath();
c.moveTo(x, y);
c.quadraticCurveTo(mx, my, ex, ey);
c.stroke();

// 4) highlight sliver (upper-left edge)
c.strokeStyle = `rgba(250, 238, 215, ${.28 - depth*.02})`;
c.lineWidth = Math.max(.5, w*.18);
c.beginPath();
c.moveTo(x-w*.2, y-w*.2);
c.quadraticCurveTo(mx-w*.2, my-w*.2, ex-w*.15, ey-w*.15);
c.stroke();

// Recursion
const branches = depth > 5 ? 2 : (rng() > .3 ? 3 : 2);
for(let i=0; i<branches; i++){
  const spread = .35 + rng()*.5;
  const turn = (i - (branches-1)/2) * spread + (rng()-.5)*.25;
  const newAng = ang + turn;
  const newLen = len * (.6 + rng()*.22);
  const newW = w * .64;
  branch(ex, ey, newLen, newAng, newW, depth-1, rng);
}

// Twigs at thin terminals
if(depth <= 2 && w < 10){
  for(let i=0; i<5; i++){
    const ta = ang + (rng()-.5)*2.2;
    const tl = 8 + rng()*22;
    const tx2 = ex + Math.cos(ta)*tl;
    const ty2 = ey + Math.sin(ta)*tl;
    c.strokeStyle = `rgba(120, 92, 62, ${.5 + rng()*.3})`;
    c.lineWidth = 1 + rng()*1.5;
    c.beginPath();
    c.moveTo(ex, ey);
    c.quadraticCurveTo(
      ex + (tx2-ex)*.5 + (rng()-.5)*4,
      ey + (ty2-ey)*.5 + (rng()-.5)*4,
      tx2, ty2
    );
    c.stroke();
  }
}

// Blossoms at terminals (thick red clusters)
if(depth <= 2){
  const bCount = 4 + Math.floor(rng()*8);
  for(let i=0; i<bCount; i++){
    const bx = ex + (rng()-.5)*60;
    const by = ey + (rng()-.5)*60;
    const br = 5 + rng()*10;

    // petal cluster — 5 offset small circles forming the flower
    for(let j=0; j<5; j++){
      const pa = j/5 * Math.PI*2 + rng()*.3;
      const pdx = bx + Math.cos(pa)*br*.7;
      const pdy = by + Math.sin(pa)*br*.7;
      // base red
      c.fillStyle = `rgba(${210+rng()*40}, ${35+rng()*30}, ${25+rng()*25}, ${.85+rng()*.15})`;
      c.beginPath(); c.arc(pdx, pdy, br*.5, 0, Math.PI*2); c.fill();
      // highlight dot
      c.fillStyle = `rgba(255, ${170+rng()*60}, ${150+rng()*50}, ${.3+rng()*.2})`;
      c.beginPath(); c.arc(pdx - br*.12, pdy - br*.12, br*.2, 0, Math.PI*2); c.fill();
    }
    // dark stamen
    c.fillStyle = 'rgba(60, 8, 4, .9)';
    c.beginPath(); c.arc(bx, by, br*.22, 0, Math.PI*2); c.fill();
  }
}

// Sparse leaves (dark silhouette)
if(depth <= 3 && rng() > .4){
  for(let i=0; i<4; i++){
    const lx2 = ex + (rng()-.5)*36;
    const ly2 = ey + (rng()-.5)*36;
    c.fillStyle = `rgba(${75+rng()*35}, ${48+rng()*25}, ${22+rng()*15}, ${.45+rng()*.25})`;
    c.beginPath();
    c.ellipse(lx2, ly2, 4 + rng()*4, 9 + rng()*5, rng()*Math.PI, 0, Math.PI*2);
    c.fill();
  }
}
```

}

// Seeded PRNG so tree is consistent
const mulberry = (seed)=>{
return ()=>{
let t = seed += 0x6D2B79F5;
t = Math.imul(t ^ t >>> 15, t | 1);
t ^= t + Math.imul(t ^ t >>> 7, t | 61);
return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
};

// Main trunk — rises from bottom-center, splits into branches
branch(700, 1780, 320, -Math.PI/2 + .08, 44, 8, mulberry(77));
branch(700, 1780, 280, -Math.PI/2 - .22, 38, 7, mulberry(19));

// Foreground subtle left and right trees (off-center, shorter)
branch(200, 1790, 180, -Math.PI/2 + .28, 22, 6, mulberry(203));
branch(1200, 1790, 170, -Math.PI/2 - .2, 20, 6, mulberry(441));

// Ground vegetation (flowing grass)
for(let i=0; i<180; i++){
const x = Math.random()*1400;
const y = 1680 + Math.random()*120;
const h = 40 + Math.random()*70;
const g = c.createLinearGradient(x, y, x + (Math.random()-.5)*10, y - h);
g.addColorStop(0, `rgba(${85+Math.random()*35}, ${52+Math.random()*25}, ${22+Math.random()*15}, ${.5+Math.random()*.3})`);
g.addColorStop(1, `rgba(${160+Math.random()*40}, ${100+Math.random()*40}, ${60+Math.random()*25}, ${.2+Math.random()*.25})`);
c.strokeStyle = g;
c.lineWidth = 1.2 + Math.random()*.8;
c.beginPath();
c.moveTo(x, y);
c.quadraticCurveTo(x + (Math.random()-.5)*20, y - h*.5, x + (Math.random()-.5)*12, y - h);
c.stroke();
}

// Scattered ground blossoms (fallen)
for(let i=0; i<50; i++){
const x = Math.random()*1400;
const y = 1680 + Math.random()*100;
const r = 3 + Math.random()*4;
c.fillStyle = `rgba(${200+Math.random()*40}, ${40+Math.random()*30}, ${30+Math.random()*20}, ${.6+Math.random()*.3})`;
c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
}

// Paper grain overlay (sumi-e washi texture)
const id = c.getImageData(0, 0, 1400, 1800);
const d = id.data;
for(let i=0; i<d.length; i+=4){
const n = (Math.random()-.5)*18;
d[i]   = Math.max(0, Math.min(255, d[i]+n));
d[i+1] = Math.max(0, Math.min(255, d[i+1]+n));
d[i+2] = Math.max(0, Math.min(255, d[i+2]+n));
}
c.putImageData(id, 0, 0);
}
buildTree();

/* ═══════════════════════════════════════════════════════════════
CLOUD PANEL (BEAT 4) — ukiyo-e painted panel cached
═══════════════════════════════════════════════════════════════ */
let cloudCanvas = null;
function buildCloudPanel(){
cloudCanvas = document.createElement(‘canvas’);
cloudCanvas.width = 1600;
cloudCanvas.height = 900;
const c = cloudCanvas.getContext(‘2d’);

// Background wash: dark slate to warm umber
const sky = c.createLinearGradient(0, 0, 0, 900);
sky.addColorStop(0, ‘#1a2330’);
sky.addColorStop(.3, ‘#2a2838’);
sky.addColorStop(.6, ‘#442a32’);
sky.addColorStop(.85, ‘#7d3e30’);
sky.addColorStop(1, ‘#582a22’);
c.fillStyle = sky;
c.fillRect(0, 0, 1600, 900);

// Add paper texture warmth
for(let i=0; i<8000; i++){
const x = Math.random()*1600, y = Math.random()*900;
c.fillStyle = `rgba(${200+Math.random()*40}, ${160+Math.random()*40}, ${120+Math.random()*40}, ${Math.random()*.06})`;
c.fillRect(x, y, 1, 1);
}

// Red mountain strata (middle band)
c.fillStyle = ‘rgba(180, 55, 30, .88)’;
c.beginPath();
c.moveTo(0, 520);
let yBase = 520;
for(let x = 0; x <= 1600; x += 30){
yBase = 520 + Math.sin(x*.008)*40 + Math.sin(x*.02)*15 + (Math.random()-.5)*10;
c.lineTo(x, yBase);
}
c.lineTo(1600, 620);
c.lineTo(0, 620);
c.closePath();
c.fill();

// Darker mountain edge stroke
c.strokeStyle = ‘rgba(100, 30, 15, .85)’;
c.lineWidth = 2;
c.beginPath();
c.moveTo(0, 520);
for(let x = 0; x <= 1600; x += 30){
c.lineTo(x, 520 + Math.sin(x*.008)*40 + Math.sin(x*.02)*15);
}
c.stroke();

// Ukiyo-e clouds: many overlapping scalloped puffs
function drawCloudShape(cx, cy, scale, alpha, tint){
c.save();
c.translate(cx, cy);
c.scale(scale, scale*.75);

```
const g = c.createRadialGradient(0, -10, 0, 0, 0, 120);
g.addColorStop(0, `rgba(${tint}, ${alpha})`);
g.addColorStop(.7, `rgba(${tint}, ${alpha*.6})`);
g.addColorStop(1, `rgba(${tint}, 0)`);
c.fillStyle = g;

// cloud body — overlapping bumps
c.beginPath();
const lobes = 7;
for(let i=0; i<lobes; i++){
  const a = (i/lobes)*Math.PI*2;
  const r = 80 + Math.sin(a*3 + i)*18;
  const x = Math.cos(a)*r*1.5;
  const y = Math.sin(a)*r*.8;
  if(i === 0) c.moveTo(x, y);
  else c.quadraticCurveTo(x*.8, y*.8, x, y);
}
c.closePath();
c.fill();

// Edge outline (ukiyo-e dark ink rim)
c.strokeStyle = `rgba(60, 40, 30, ${alpha*.4})`;
c.lineWidth = 1.2;
c.stroke();

c.restore();
```

}

// Populate clouds across the panel
const cloudCfg = [
[160,  180, 1.4, .9,  ‘245,238,220’],
[400,  120, 1.1, .85, ‘250,240,225’],
[680,  200, 1.7, .95, ‘252,245,230’],
[1000, 150, 1.3, .88, ‘245,230,215’],
[1300, 210, 1.5, .92, ‘248,235,218’],
[220,  400, 1.2, .78, ‘235,215,190’],
[560,  370, 1.6, .85, ‘240,220,195’],
[900,  420, 1.4, .82, ‘238,218,192’],
[1200, 380, 1.3, .75, ‘232,210,180’],
[320,  720, 1.5, .82, ‘230,215,195’],
[780,  760, 1.8, .88, ‘238,222,200’],
[1280, 740, 1.2, .78, ‘228,210,188’],
];
cloudCfg.forEach(([x,y,s,a,t]) => drawCloudShape(x, y, s, a, t));

// Wave pattern along bottom (Hokusai-style line waves)
c.strokeStyle = ‘rgba(40, 55, 80, .7)’;
c.lineWidth = 1.5;
for(let row = 0; row < 6; row++){
const yBase2 = 700 + row*35;
c.beginPath();
for(let x = 0; x <= 1600; x += 8){
const y = yBase2 + Math.sin((x+row*40)*.03)*8 + Math.sin(x*.008)*4;
if(x === 0) c.moveTo(x, y);
else c.lineTo(x, y);
}
c.stroke();
}

// Warm vignette
const vg = c.createRadialGradient(800, 450, 300, 800, 450, 1200);
vg.addColorStop(0, ‘rgba(0,0,0,0)’);
vg.addColorStop(1, ‘rgba(10,6,3,.5)’);
c.fillStyle = vg;
c.fillRect(0, 0, 1600, 900);
}
buildCloudPanel();

/* ═══════════════════════════════════════════════════════════════
BG DRAW — composites sky, tree, clouds, dawn based on progress
Only redraws when beat changes or when animated (fog, stars).
═══════════════════════════════════════════════════════════════ */
function drawBg(){
const W = innerWidth, H = innerHeight;
bgx.clearRect(0,0,W,H);
const p = S.progress;

// Phase weights
const voidW  = 1 - smoothstep(0.00, 0.06, p);
const treeW  = smoothstep(0.04, 0.12, p) * (1 - smoothstep(0.34, 0.44, p));
const cloudW = smoothstep(0.36, 0.46, p) * (1 - smoothstep(0.56, 0.62, p));
const impactFlash = (p >= 0.585 && p < 0.605) ? 1 : 0;
const lightW = smoothstep(0.605, 0.67, p) * (1 - smoothstep(0.74, 0.80, p));
const dawnW  = smoothstep(0.80, 0.86, p);

// ── Base void / sky gradient ──
if(voidW > 0 || treeW > 0 || cloudW > 0){
const g = bgx.createRadialGradient(W*.5, H*.35, 0, W*.5, H*.5, Math.max(W,H));
g.addColorStop(0, ‘#15101a’);
g.addColorStop(.4, ‘#0a0810’);
g.addColorStop(1, ‘#040306’);
bgx.fillStyle = g;
bgx.fillRect(0,0,W,H);

```
// Red horizon glow
const hg = bgx.createLinearGradient(0, H*.55, 0, H);
hg.addColorStop(0, 'rgba(255,79,54,0)');
hg.addColorStop(1, 'rgba(120,20,15,.35)');
bgx.fillStyle = hg;
bgx.fillRect(0,0,W,H);
```

}

// ── Tree layer (beats 2-3) ──
if(treeW > 0.01 && treeCanvas){
bgx.save();
bgx.globalAlpha = treeW;
const tw = treeCanvas.width, th = treeCanvas.height;
const scale = Math.max(W/tw, H/th) * 1.02;
const dw = tw*scale, dh = th*scale;
const dx = (W-dw)*.5 + S.nx*12;
const dy = H - dh + 20;
bgx.drawImage(treeCanvas, dx, dy, dw, dh);
bgx.restore();

```
// ambient fog band
bgx.save();
bgx.globalCompositeOperation = 'screen';
for(let i=0; i<3; i++){
  const fy = H*.62 + i*40;
  const fop = .05 - i*.01;
  const fg = bgx.createLinearGradient(0, fy-120, 0, fy+120);
  fg.addColorStop(0, 'rgba(120,80,160,0)');
  fg.addColorStop(.5, `rgba(80,40,100,${fop*treeW})`);
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  bgx.fillStyle = fg;
  bgx.fillRect(0, fy-120, W, 240);
}
bgx.restore();
```

}

// ── Cloud panel (beats 4-5) ──
if(cloudW > 0.01 && cloudCanvas){
bgx.save();
bgx.globalAlpha = cloudW;
const cw = cloudCanvas.width, ch = cloudCanvas.height;
const scale = Math.max(W/cw, H/ch) * 1.05;
const dw = cw*scale, dh = ch*scale;
// slow drift
const driftX = Math.sin(S.t*.05)*40 + S.nx*18;
const dx = (W-dw)*.5 + driftX;
const dy = (H-dh)*.5 + S.ny*10;
bgx.drawImage(cloudCanvas, dx, dy, dw, dh);
bgx.restore();
}

// ── Impact white flash ──
if(impactFlash > 0){
bgx.save();
bgx.globalCompositeOperation = ‘screen’;
bgx.fillStyle = ‘rgba(255,245,230,.9)’;
bgx.fillRect(0,0,W,H);
bgx.restore();
}

// ── Light theme disintegration (beats 5-6) ──
if(lightW > 0.01){
bgx.fillStyle = `rgba(230, 223, 228, ${lightW})`;
bgx.fillRect(0,0,W,H);
}

// ── Dawn night scene (beats 7-8) ──
if(dawnW > 0.01){
drawDawnBg(dawnW);
}

// ── Stars (void + pre-dawn) ──
if(voidW > 0.3 || (p > 0.76 && p < 0.82)){
const starOp = Math.max(voidW*.6, (p > 0.76 && p < 0.82) ? .3 : 0);
bgx.fillStyle = `rgba(220,210,230,${starOp})`;
for(let i=0; i<70; i++){
const sx = ((i*173.7)%W);
const sy = ((i*97.3)%(H*.6));
const r = .5 + (i%3)*.45;
bgx.beginPath(); bgx.arc(sx, sy, r, 0, Math.PI*2); bgx.fill();
}
}

// ── Vignette (always) ──
const vg = bgx.createRadialGradient(W*.5, H*.5, Math.min(W,H)*.3, W*.5, H*.5, Math.max(W,H)*.7);
vg.addColorStop(0, ‘rgba(0,0,0,0)’);
vg.addColorStop(1, ‘rgba(0,0,0,.5)’);
bgx.fillStyle = vg;
bgx.fillRect(0,0,W,H);
}

/* ═══════════════════════════════════════════════════════════════
DAWN BG — night sea + moon + distant rock stacks
═══════════════════════════════════════════════════════════════ */
function drawDawnBg(alpha){
const W = innerWidth, H = innerHeight;
bgx.save();
bgx.globalAlpha = alpha;

// Deep night sky
const sky = bgx.createLinearGradient(0, 0, 0, H*.65);
sky.addColorStop(0, ‘#050a18’);
sky.addColorStop(.5, ‘#0b1829’);
sky.addColorStop(1, ‘#162536’);
bgx.fillStyle = sky;
bgx.fillRect(0, 0, W, H*.65);

// Subtle atmospheric haze near horizon
const haze = bgx.createLinearGradient(0, H*.45, 0, H*.65);
haze.addColorStop(0, ‘rgba(80,120,160,0)’);
haze.addColorStop(1, ‘rgba(100,140,180,.15)’);
bgx.fillStyle = haze;
bgx.fillRect(0, H*.45, W, H*.2);

// Moon
const moonX = W*.38, moonY = H*.18, moonR = Math.min(W,H)*.042;
// Moon halo
const halo = bgx.createRadialGradient(moonX, moonY, moonR*.5, moonX, moonY, moonR*6);
halo.addColorStop(0, ‘rgba(220,230,245,.28)’);
halo.addColorStop(.3, ‘rgba(180,200,230,.15)’);
halo.addColorStop(1, ‘rgba(100,130,170,0)’);
bgx.fillStyle = halo;
bgx.fillRect(0, 0, W, H);
// Moon disk
const moon = bgx.createRadialGradient(moonX - moonR*.25, moonY - moonR*.25, 0, moonX, moonY, moonR);
moon.addColorStop(0, ‘#f4f6fa’);
moon.addColorStop(.6, ‘#d8dde5’);
moon.addColorStop(1, ‘#a5adbb’);
bgx.fillStyle = moon;
bgx.beginPath(); bgx.arc(moonX, moonY, moonR, 0, Math.PI*2); bgx.fill();
// Moon craters (subtle)
bgx.fillStyle = ‘rgba(100,110,125,.3)’;
bgx.beginPath(); bgx.arc(moonX + moonR*.15, moonY - moonR*.1, moonR*.15, 0, Math.PI*2); bgx.fill();
bgx.beginPath(); bgx.arc(moonX - moonR*.2, moonY + moonR*.18, moonR*.12, 0, Math.PI*2); bgx.fill();

// Stars (denser, brighter in night sky)
for(let i=0; i<120; i++){
const sx = ((i*213.37)%W);
const sy = ((i*87.19)%(H*.55));
const r = .4 + (i%4)*.35;
const twink = .4 + .3*Math.sin(S.t*1.2 + i);
bgx.fillStyle = `rgba(240,245,255,${.35*twink})`;
bgx.beginPath(); bgx.arc(sx, sy, r, 0, Math.PI*2); bgx.fill();
}

// Distant rock stacks on the right (inspired by reference image)
drawRockStacks(W*.72, H*.35, H*.35);

// Sea
const seaTop = H*.55;
const seaG = bgx.createLinearGradient(0, seaTop, 0, H);
seaG.addColorStop(0, ‘#0c1a2a’);
seaG.addColorStop(.5, ‘#0a1523’);
seaG.addColorStop(1, ‘#06101c’);
bgx.fillStyle = seaG;
bgx.fillRect(0, seaTop, W, H - seaTop);

// Moon reflection on water (rippling path of light)
bgx.save();
bgx.globalCompositeOperation = ‘screen’;
for(let i=0; i<30; i++){
const ry = seaTop + 4 + i*4;
const rxW = (moonR*2) * (1 + i*.12);
const rxC = moonX + Math.sin(S.t*.8 + i*.3)*2.5;
const rxG = bgx.createLinearGradient(rxC - rxW, ry, rxC + rxW, ry);
rxG.addColorStop(0, ‘rgba(200,220,255,0)’);
rxG.addColorStop(.5, `rgba(220,235,255,${.25 - i*.005})`);
rxG.addColorStop(1, ‘rgba(200,220,255,0)’);
bgx.fillStyle = rxG;
bgx.fillRect(rxC - rxW, ry, rxW*2, 2);
}
bgx.restore();

// Horizon mist
const mist = bgx.createLinearGradient(0, H*.5, 0, H*.62);
mist.addColorStop(0, ‘rgba(150,175,200,0)’);
mist.addColorStop(.5, ‘rgba(130,160,190,.2)’);
mist.addColorStop(1, ‘rgba(100,140,180,0)’);
bgx.fillStyle = mist;
bgx.fillRect(0, H*.5, W, H*.15);

bgx.restore();
}

function drawRockStacks(cx, cy, size){
const silhouette = ‘rgba(14,22,38,.92)’;
bgx.fillStyle = silhouette;

// Main stack (tall, jagged)
bgx.beginPath();
bgx.moveTo(cx - size*.25, cy + size*.5);
bgx.lineTo(cx - size*.22, cy + size*.15);
bgx.lineTo(cx - size*.14, cy - size*.1);
bgx.lineTo(cx - size*.08, cy - size*.25);
bgx.lineTo(cx, cy - size*.35);
bgx.lineTo(cx + size*.06, cy - size*.2);
bgx.lineTo(cx + size*.14, cy - size*.05);
bgx.lineTo(cx + size*.2, cy + size*.1);
bgx.lineTo(cx + size*.25, cy + size*.25);
bgx.lineTo(cx + size*.28, cy + size*.5);
bgx.closePath();
bgx.fill();

// Smaller side stacks
bgx.beginPath();
bgx.moveTo(cx - size*.45, cy + size*.5);
bgx.lineTo(cx - size*.42, cy + size*.2);
bgx.lineTo(cx - size*.38, cy + size*.05);
bgx.lineTo(cx - size*.33, cy + size*.15);
bgx.lineTo(cx - size*.3, cy + size*.5);
bgx.closePath();
bgx.fill();

bgx.beginPath();
bgx.moveTo(cx + size*.35, cy + size*.5);
bgx.lineTo(cx + size*.4, cy + size*.28);
bgx.lineTo(cx + size*.45, cy + size*.35);
bgx.lineTo(cx + size*.5, cy + size*.5);
bgx.closePath();
bgx.fill();

// Edge highlight from moonlight
bgx.strokeStyle = ‘rgba(150,180,210,.25)’;
bgx.lineWidth = 1;
bgx.beginPath();
bgx.moveTo(cx - size*.14, cy - size*.1);
bgx.lineTo(cx - size*.08, cy - size*.25);
bgx.lineTo(cx, cy - size*.35);
bgx.lineTo(cx + size*.06, cy - size*.2);
bgx.stroke();
}

/* ═══════════════════════════════════════════════════════════════
LANDSCAPE CANVAS (grass + dandelions) — DAWN SCENE
Drawn into ‘land’ canvas, cached when progress bucket changes
═══════════════════════════════════════════════════════════════ */
function invalidateLandCache(){ S.landCacheKey = null; }

function drawLandscape(){
const p = S.progress;
const landW = smoothstep(0.82, 0.90, p);
if(landW < 0.01){
lx.clearRect(0, 0, innerWidth, innerHeight);
return;
}

const W = innerWidth, H = innerHeight;
lx.clearRect(0, 0, W, H);
lx.save();
lx.globalAlpha = landW;

// Grass blades — animated bezier sway
const blades = 280;
const hillTop = H * .58;
for(let i=0; i<blades; i++){
const bx = ((i*37) % W) + (i%7)*3;
const depth = Math.random(); // locked via index
const dSeed = (i*57.3) % 1;
const baseY = hillTop + dSeed*H*.42;
const height = 24 + dSeed*80 + (i%5)*4;
const sway = Math.sin(S.t*1.2 + i*.17) * (2 + dSeed*6);
const tipX = bx + sway;
const tipY = baseY - height;

```
lx.strokeStyle = `rgba(${20+dSeed*40}, ${35+dSeed*45}, ${30+dSeed*30}, ${.6+dSeed*.4})`;
lx.lineWidth = 1 + dSeed*1.3;
lx.lineCap = 'round';
lx.beginPath();
lx.moveTo(bx, baseY);
lx.quadraticCurveTo(bx + sway*.4, baseY - height*.5, tipX, tipY);
lx.stroke();
```

}

// Highlight grass tips (moonlit)
for(let i=0; i<100; i++){
const bx = ((i*73.1) % W);
const by = hillTop + (Math.random()*.4 + .1) * H*.35;
const sway = Math.sin(S.t*1.4 + i*.22) * 5;
lx.strokeStyle = `rgba(180,210,230,.2)`;
lx.lineWidth = .7;
lx.beginPath();
lx.moveTo(bx, by);
lx.quadraticCurveTo(bx + sway*.5, by - 25, bx + sway, by - 45);
lx.stroke();
}

// Dandelion puffs
const dandelions = 14;
for(let i=0; i<dandelions; i++){
const dx = (i*131 % W) + (i%3)*25;
const dy = hillTop + (i%5)*25 + H*.1;
const dsway = Math.sin(S.t*.9 + i*.6) * 4;
drawDandelion(dx + dsway, dy, 14 + (i%4)*3);
}

// Flying seeds
const seeds = 26;
for(let i=0; i<seeds; i++){
const baseX = (i*83) % W;
const baseY = (i*59) % H;
const sx2 = (baseX + S.t*18 + Math.sin(S.t*.7 + i)*20) % (W + 40) - 20;
const sy2 = baseY - S.t*9 + Math.sin(S.t*1.1 + i*.5)*15;
const wrappedY = ((sy2 % H) + H) % H;
lx.fillStyle = ‘rgba(240,245,255,.6)’;
lx.beginPath(); lx.arc(sx2, wrappedY, 1.2, 0, Math.PI*2); lx.fill();

```
// seed bristles
lx.strokeStyle = 'rgba(240,245,255,.2)';
lx.lineWidth = .5;
for(let j=0; j<5; j++){
  const a = j/5 * Math.PI*2;
  lx.beginPath();
  lx.moveTo(sx2, wrappedY);
  lx.lineTo(sx2 + Math.cos(a)*4, wrappedY + Math.sin(a)*4);
  lx.stroke();
}
```

}

lx.restore();
}

function drawDandelion(x, y, r){
// stem
lx.strokeStyle = ‘rgba(60,80,60,.7)’;
lx.lineWidth = 1.5;
lx.beginPath();
lx.moveTo(x, y);
lx.quadraticCurveTo(x + Math.sin(S.t*.8)*4, y + 30, x + Math.sin(S.t*.8)*6, y + 60);
lx.stroke();

// puff center
lx.fillStyle = ‘rgba(160,170,160,.8)’;
lx.beginPath(); lx.arc(x, y, r*.25, 0, Math.PI*2); lx.fill();

// seeds radiating
const seeds = 28;
for(let i=0; i<seeds; i++){
const a = (i/seeds) * Math.PI*2 + S.t*.1;
const sr = r * (.85 + Math.random()*.3);
const sx2 = x + Math.cos(a) * sr;
const sy2 = y + Math.sin(a) * sr;

```
// stem of seed
lx.strokeStyle = 'rgba(220,230,240,.5)';
lx.lineWidth = .6;
lx.beginPath();
lx.moveTo(x, y);
lx.lineTo(sx2, sy2);
lx.stroke();

// fluff
lx.fillStyle = 'rgba(240,245,250,.75)';
lx.beginPath();
lx.arc(sx2, sy2, 1.4, 0, Math.PI*2);
lx.fill();

// bristles
lx.strokeStyle = 'rgba(240,245,250,.35)';
lx.lineWidth = .4;
for(let j=0; j<4; j++){
  const ba = a + (j/4 - .5)*.8;
  lx.beginPath();
  lx.moveTo(sx2, sy2);
  lx.lineTo(sx2 + Math.cos(ba)*3, sy2 + Math.sin(ba)*3);
  lx.stroke();
}
```

}
}

/* ═══════════════════════════════════════════════════════════════
FX CANVAS — petals, embers, lightning
═══════════════════════════════════════════════════════════════ */
const petals = [];
function spawnPetal(){
const isClose = Math.random() < 0.07;
return {
x: Math.random()*innerWidth + 200,
y: -30 - Math.random()*80,
sz: isClose ? 20+Math.random()*18 : 3+Math.random()*5,
rot: Math.random()*Math.PI*2,
rv: (Math.random()-.5)*.02,
vx: -.3 - Math.random()*.7 - (isClose?.3:0),
vy: .15 + Math.random()*.45 + (isClose?.3:0),
sw: Math.random()*Math.PI*2,
ss: .005 + Math.random()*.012,
sa: .3 + Math.random()*1.0,
op: isClose ? .3+Math.random()*.25 : .35+Math.random()*.5,
glass: isClose,
hue: Math.random() > .5 ? ‘pink’ : ‘red’,
};
}
for(let i=0; i<70; i++){
const p = spawnPetal(); p.y = Math.random()*innerHeight;
petals.push(p);
}

const embers = [];
for(let i=0; i<22; i++){
embers.push({
x: Math.random()*innerWidth, y: Math.random()*innerHeight,
r: .8 + Math.random()*1.6,
vx: (Math.random()-.5)*.25, vy: -(0.12 + Math.random()*.4),
fl: Math.random()*Math.PI*2, fs: .03 + Math.random()*.06,
op: .25 + Math.random()*.4,
});
}

function drawPetalShape(sz, stroke=false){
for(let i=0; i<5; i++){
fxx.save();
fxx.rotate(i * Math.PI*2/5);
fxx.beginPath();
fxx.ellipse(0, -sz*.5, sz*.26, sz*.52, 0, 0, Math.PI*2);
if(stroke) fxx.stroke(); else fxx.fill();
fxx.restore();
}
}

function drawFx(){
const W = innerWidth, H = innerHeight;
fxx.clearRect(0, 0, W, H);
const p = S.progress;

// petals only in pre-cloud beats
const petalW = (1 - smoothstep(0.44, 0.55, p));
if(petalW > 0.01){
const wind = Math.sin(S.t*.4) * 1.1;

```
petals.forEach(pe => {
  pe.sw += pe.ss;
  pe.x += pe.vx + Math.sin(pe.sw)*pe.sa + wind;
  pe.y += pe.vy;
  pe.rot += pe.rv;
  if(pe.y > H+40 || pe.x < -60){ Object.assign(pe, spawnPetal()); pe.y = -30; }

  fxx.save();
  fxx.translate(pe.x, pe.y);
  fxx.rotate(pe.rot);
  fxx.globalAlpha = pe.op * petalW;

  if(pe.glass){
    fxx.filter = 'blur(.6px)';
    const g = fxx.createRadialGradient(0, 0, 0, 0, 0, pe.sz);
    g.addColorStop(0, 'rgba(255,200,210,.4)');
    g.addColorStop(.6, 'rgba(255,160,180,.2)');
    g.addColorStop(1, 'rgba(220,120,150,0)');
    fxx.fillStyle = g;
    drawPetalShape(pe.sz);
    fxx.filter = 'none';

    fxx.strokeStyle = 'rgba(255,210,220,.6)';
    fxx.lineWidth = .7;
    drawPetalShape(pe.sz, true);

    const sg = fxx.createRadialGradient(-pe.sz*.2, -pe.sz*.3, 0, -pe.sz*.2, -pe.sz*.3, pe.sz*.4);
    sg.addColorStop(0, 'rgba(255,255,255,.55)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    fxx.fillStyle = sg;
    fxx.beginPath(); fxx.arc(-pe.sz*.2, -pe.sz*.3, pe.sz*.4, 0, Math.PI*2); fxx.fill();
  } else {
    fxx.fillStyle = pe.hue === 'pink' ? 'rgba(255,170,190,1)' : 'rgba(255,90,80,1)';
    drawPetalShape(pe.sz);
  }
  fxx.restore();
});
```

}

// embers in pre-cloud beats
if(petalW > 0.01){
embers.forEach(e => {
e.x += e.vx; e.y += e.vy; e.fl += e.fs;
if(e.y < -10) e.y = H+10;
if(e.x < -8) e.x = W+8;
if(e.x > W+8) e.x = -8;
const op = e.op * (0.5 + 0.5*Math.sin(e.fl)) * petalW;
const g = fxx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r*4);
g.addColorStop(0, `rgba(255,140,80,${op})`);
g.addColorStop(.4, `rgba(220,80,40,${op*.4})`);
g.addColorStop(1, ‘rgba(120,20,10,0)’);
fxx.fillStyle = g;
fxx.beginPath(); fxx.arc(e.x, e.y, e.r*4, 0, Math.PI*2); fxx.fill();
});
}

// lightning during cloud traversal
if(p > 0.44 && p < 0.60){
S.lightningT -= S.dt;
if(S.lightningT <= 0){
spawnLightning();
S.lightningT = .45 + Math.random()*.7;
}
}
drawLightning();
}

/* ═══════════ LIGHTNING ═══════════ */
function spawnLightning(){
const x1 = innerWidth * (.2 + Math.random()*.6);
const y1 = -20;
const x2 = x1 + (Math.random()-.5)*innerWidth*.4;
const y2 = innerHeight * (.5 + Math.random()*.3);
S.lightning.push({
x1, y1, x2, y2,
life:1, decay:.04 + Math.random()*.03,
seed:Math.random()*1000,
branches:Math.floor(Math.random()*3)+1,
});
}
function lightningSegments(x1,y1,x2,y2,detail,seed){
const segs=[[x1,y1]];
const N=14;
const rng=s=>{let x=Math.sin(s+seed)*43758.5; return x-Math.floor(x);};
for(let i=1;i<N;i++){
const t=i/N;
const tx=x1+(x2-x1)*t;
const ty=y1+(y2-y1)*t;
const offset=detail*(rng(i*3.7)-.5)*50;
const perpX=-(y2-y1), perpY=(x2-x1);
const pl=Math.hypot(perpX,perpY);
const px=perpX/pl, py=perpY/pl;
segs.push([tx+px*offset, ty+py*offset]);
}
segs.push([x2,y2]);
return segs;
}
function drawLightning(){
S.lightning = S.lightning.filter(b=>b.life>0);
S.lightning.forEach(b=>{
b.life -= b.decay;
const op = Math.max(0, b.life);
const segs = lightningSegments(b.x1,b.y1,b.x2,b.y2,b.life,b.seed);

```
// outer glow
fxx.strokeStyle = `rgba(200,180,255,${op*.35})`;
fxx.lineWidth = 9; fxx.lineCap='round'; fxx.lineJoin='round';
fxx.beginPath();
segs.forEach((p,i)=>i?fxx.lineTo(p[0],p[1]):fxx.moveTo(p[0],p[1]));
fxx.stroke();

// mid
fxx.strokeStyle = `rgba(230,210,255,${op*.65})`;
fxx.lineWidth = 3.2;
fxx.beginPath();
segs.forEach((p,i)=>i?fxx.lineTo(p[0],p[1]):fxx.moveTo(p[0],p[1]));
fxx.stroke();

// core
fxx.strokeStyle = `rgba(255,250,255,${op})`;
fxx.lineWidth = 1.2;
fxx.beginPath();
segs.forEach((p,i)=>i?fxx.lineTo(p[0],p[1]):fxx.moveTo(p[0],p[1]));
fxx.stroke();

// branches
for(let k=0; k<b.branches; k++){
  const si = Math.floor(segs.length*(.3+k*.18));
  if(si >= segs.length-1) continue;
  const sp = segs[si];
  const bAng = Math.atan2(b.y2-b.y1, b.x2-b.x1) + (Math.random()-.5)*1.6;
  const bLen = 60 + Math.random()*90;
  const bx2 = sp[0] + Math.cos(bAng)*bLen;
  const by2 = sp[1] + Math.sin(bAng)*bLen;
  const bSegs = lightningSegments(sp[0],sp[1],bx2,by2,b.life*.8,b.seed+k*7);
  fxx.strokeStyle = `rgba(220,200,255,${op*.28})`;
  fxx.lineWidth = 4;
  fxx.beginPath();
  bSegs.forEach((p,i)=>i?fxx.lineTo(p[0],p[1]):fxx.moveTo(p[0],p[1]));
  fxx.stroke();
  fxx.strokeStyle = `rgba(255,240,255,${op*.8})`;
  fxx.lineWidth = 1;
  fxx.beginPath();
  bSegs.forEach((p,i)=>i?fxx.lineTo(p[0],p[1]):fxx.moveTo(p[0],p[1]));
  fxx.stroke();
}
```

});
}

/* ═══════════════════════════════════════════════════════════════
GLASS SHATTER — fires once on impact at ~58.5% scroll
═══════════════════════════════════════════════════════════════ */
function fireShatter(){
if(S.shatterFired) return;
S.shatterFired = true;
const layer = $(‘shatter’);
layer.classList.add(’-on’);

// Generate ~40 shards with polygon clip paths, flying outward
const N = 46;
const cx = innerWidth * .5;
const cy = innerHeight * .5;
for(let i=0; i<N; i++){
const shard = document.createElement(‘div’);
shard.className = ‘shard’;

```
// irregular polygon clip-path
const pts = [];
const sides = 3 + Math.floor(Math.random()*3);
for(let j=0; j<sides; j++){
  pts.push(`${Math.random()*100}% ${Math.random()*100}%`);
}
shard.style.clipPath = `polygon(${pts.join(',')})`;

const size = 60 + Math.random()*180;
shard.style.width = size + 'px';
shard.style.height = (size * (.5 + Math.random()*.8)) + 'px';
shard.style.left = (cx - size/2) + 'px';
shard.style.top = (cy - size/2) + 'px';

layer.appendChild(shard);

// physics: fly outward then settle
const angle = (i/N) * Math.PI*2 + (Math.random()-.5)*.6;
const speed = 250 + Math.random()*550;
const tx = Math.cos(angle) * speed;
const ty = Math.sin(angle) * speed + Math.random()*200;
const rot = (Math.random()-.5) * 720;

shard.animate([
  { transform:'translate(0,0) rotate(0deg) scale(.4)', opacity:1 },
  { transform:`translate(${tx*.3}px, ${ty*.3}px) rotate(${rot*.3}deg) scale(1)`, opacity:1, offset:.2 },
  { transform:`translate(${tx}px, ${ty + 400}px) rotate(${rot}deg) scale(.6)`, opacity:0 }
], {
  duration: 1800 + Math.random()*900,
  easing: 'cubic-bezier(.2,.7,.3,1)',
  fill:'forwards'
});
```

}

// white flash
const flash = document.createElement(‘div’);
flash.style.cssText = `position:absolute; inset:0; z-index:33; background:radial-gradient(circle at 50% 50%, rgba(255,250,240,1) 0%, rgba(255,240,220,.6) 30%, rgba(255,200,180,0) 60%); opacity:1; pointer-events:none; mix-blend-mode:screen;`;
layer.appendChild(flash);
flash.animate([
{ opacity:1 }, { opacity:0 }
], { duration:900, easing:‘ease-out’, fill:‘forwards’ });

// clean up shards after animation
setTimeout(()=>{ layer.innerHTML = ‘’; layer.classList.remove(’-on’); }, 3500);
}

/* ═══════════════════════════════════════════════════════════════
SPRITE (narrator character)
═══════════════════════════════════════════════════════════════ */
const spriteCv = $(‘sprite’);
const sx = spriteCv.getContext(‘2d’);
let spriteFrame = 0;

const SPRITE_FRAMES = [
[“0000011111100000”,“0001155555510000”,“0011555555551000”,“0115555555555100”,“0115554444555100”,“0115544444445100”,“0115544114451000”,“0011544444510000”,“0001144666110000”,“0011226666221100”,“0122222222222210”,“1222222222222221”,“1233322222233321”,“1233322222233321”,“1233322222233321”,“1223322222233221”,“0122322222232210”,“0012332222332100”,“0001233333321000”,“0000122222210000”],
[“0000011111100000”,“0001155555510000”,“0011555555551000”,“0115555555555100”,“0115554444555100”,“0115544444445100”,“0115544114451000”,“0011544444510000”,“0001144666110000”,“0011226666221100”,“0122222222222210”,“1222222222222221”,“1233322222233321”,“1233322222233321”,“1233322222233321”,“1232222222232221”,“0122322222232210”,“0012332222332100”,“0001233333321000”,“0000122222210000”],
];
const PALETTE = {‘1’:’#0c0a0d’,‘2’:’#1f1a24’,‘3’:’#322a3a’,‘4’:’#d8c8a8’,‘5’:’#f0e8e0’,‘6’:’#ff4f36’};
function drawSprite(){
const f = SPRITE_FRAMES[Math.floor(spriteFrame) % SPRITE_FRAMES.length];
sx.clearRect(0, 0, 32, 40);
for(let y=0; y<f.length; y++){
for(let x=0; x<f[y].length; x++){
const v = f[y][x];
if(v === ‘0’) continue;
sx.fillStyle = PALETTE[v];
sx.fillRect(x*2, y*2, 2, 2);
}
}
}
drawSprite();
setInterval(()=>{ spriteFrame += 1; drawSprite(); }, 500);

/* ═══════════════════════════════════════════════════════════════
GLITCH SCRAMBLER — text morphs through kana/kanji before settling
═══════════════════════════════════════════════════════════════ */
const KANA = ‘アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン’;
const KANJI = ‘刀剣魂創造夢幻覚醒鬼殺神血月風炎水雷’;
const SYMBOLS = ‘▓▒░│┤┐└┴┬├─┼╪╩╦╠═╬’;
const scramble = (len) => {
let s = ‘’;
for(let i=0; i<len; i++){
const src = Math.random() < .5 ? KANA : (Math.random() < .6 ? KANJI : SYMBOLS);
s += src[Math.floor(Math.random()*src.length)];
}
return s;
};

const scrambleStates = new WeakMap();
function runScramble(el, targetHtml, dur=800){
if(scrambleStates.get(el)?.targetHtml === targetHtml) return;
// Parse target as HTML chunks — split by | for multi-line
const lines = targetHtml.split(’|’);
const linesText = lines.map(l => l.replace(/<[^>]+>/g, ‘’));

const state = { targetHtml, done:false };
scrambleStates.set(el, state);
if(state.interval) clearInterval(state.interval);

const steps = 12;
let step = 0;
state.interval = setInterval(()=>{
step++;
const prog = step/steps;
// mix scramble + real
const mixed = lines.map((line, li) => {
const plain = linesText[li];
const revealCount = Math.floor(plain.length * prog);
const visible = plain.slice(0, revealCount);
const scrambleCount = Math.max(0, Math.min(plain.length - revealCount, 6));
const scr = scramble(scrambleCount);
// use original line (with HTML) for final, approximate for transitional
if(step >= steps){
return line; // final with HTML tags
}
return visible + scr;
});

```
if(step >= steps){
  el.innerHTML = lines.join('<br>');
  clearInterval(state.interval);
  state.done = true;
} else {
  el.innerHTML = mixed.join('<br>');
}
```

}, dur/steps);
}

/* ═══════════════════════════════════════════════════════════════
M-GLYPH MORPH — rotates m through 3 and D
═══════════════════════════════════════════════════════════════ */
function updateMGlyph(){
const el = $(‘brand-m’);
if(!el) return;
// Cycle every 6 seconds: m (0-1.5s) → 3 (1.5-3s) → D (3-4.5s) → m again
const cycle = (S.t % 6) / 6;
let glyph = ‘m’;
let rot = 0;
if(cycle < .25){ glyph = ‘m’; rot = cycle*4*10; }
else if(cycle < .5){ glyph = ‘3’; rot = (cycle-.25)*4*90; }
else if(cycle < .75){ glyph = ‘D’; rot = 90 + (cycle-.5)*4*180; }
else { glyph = ‘m’; rot = -90 + (cycle-.75)*4*90; }
if(el.textContent !== glyph) el.textContent = glyph;
el.style.transform = `rotate(${rot}deg)`;
}

/* ═══════════════════════════════════════════════════════════════
WORKS GRID BUILD
═══════════════════════════════════════════════════════════════ */
function buildWorksGrid(){
const grid = $(‘works-grid’);
grid.innerHTML = WORKS.map((w, i) => ` <div class="work-card ${w.span}" style="--card-bg:${w.tint}"> <div class="wc-no"><span>N° ${w.no}</span><span class="year">${w.year}</span></div> <h3 class="wc-title">${w.title}</h3> <div class="wc-role">${w.role}</div> <p class="wc-desc">${w.desc}</p> <div class="wc-meta"> ${w.tags.map(t=>`<span>${t}</span>`).join('')} </div> </div> `).join(’’);
}
buildWorksGrid();

/* ═══════════════════════════════════════════════════════════════
BEAT ORCHESTRATION
═══════════════════════════════════════════════════════════════ */
function smoothstep(a, b, x){
const t = Math.max(0, Math.min(1, (x-a)/(b-a)));
return t*t*(3 - 2*t);
}
function lerp(a, b, t){ return a + (b-a)*t; }
function toggleClass(el, cls, on){
if(!el) return;
if(on) el.classList.add(cls); else el.classList.remove(cls);
}

function updateScene(){
const p = S.progress;

// ─── Katana choreography ───
if(KAT.userData.model){
/* 8-beat blade journey:
0.00-0.06  BEAT 1: huge, tilted, portrait
0.06-0.22  BEAT 2: pulls back, rotates to near-horizontal, tree rises
0.22-0.36  BEAT 3: dialogue hold, slow drift, edge-glow builds
0.36-0.46  BEAT 4: flies up into clouds (arc trajectory)
0.46-0.58  BEAT 5: traverses cloud panel, tilts dramatically
0.58-0.62  BEAT 6: PLUNGE + IMPACT (sharp descent, then pause)
0.62-0.78  BEAT 7: works grid — sword rests, small, top of frame
0.78-1.00  BEAT 8: dawn — sword plants upright in foreground */

```
// Position
let kx, ky, kz, rX, rY, rZ;

if(p < 0.06){
  // Beat 1: portrait zoom
  kx = lerp(0.3, 0.25, smoothstep(0,.06,p));
  ky = -0.05;
  kz = lerp(0.4, 0.6, smoothstep(0,.06,p));
  rX = S.ny*.04;
  rY = 0.3;
  rZ = -Math.PI*.42;
} else if(p < 0.22){
  // Beat 2: back, rotate to almost-horizontal
  const t = smoothstep(.06,.22,p);
  kx = lerp(.25, 0, t);
  ky = lerp(-.05, .05, t);
  kz = lerp(.6, 5.2, t);
  rX = S.ny*.05;
  rY = lerp(.3, 0, t);
  rZ = lerp(-Math.PI*.42, 0, t);
} else if(p < 0.36){
  // Beat 3: slow hold
  kx = Math.sin(S.t*.3)*.05;
  ky = .05 + Math.sin(S.t*.5)*.02;
  kz = lerp(5.2, 5.8, smoothstep(.22,.36,p));
  rX = S.ny*.05 + Math.sin(S.t*.3)*.008;
  rY = 0;
  rZ = 0;
} else if(p < 0.46){
  // Beat 4: arc upward into clouds
  const t = smoothstep(.36,.46,p);
  kx = lerp(0, -1.5, t);
  ky = lerp(.05, 1.8, t);
  kz = lerp(5.8, 4.5, t);
  rX = lerp(0, -.35, t);
  rY = lerp(0, -.4, t);
  rZ = lerp(0, -Math.PI*.25, t);
} else if(p < 0.58){
  // Beat 5: traverse across cloud panel
  const t = smoothstep(.46,.58,p);
  kx = lerp(-1.5, 1.5, t);
  ky = lerp(1.8, 0.5, t);
  kz = lerp(4.5, 3.8, t);
  rX = lerp(-.35, -.15, t);
  rY = lerp(-.4, .3, t);
  rZ = lerp(-Math.PI*.25, -Math.PI*.08, t);
} else if(p < 0.62){
  // Beat 6: PLUNGE to impact
  const t = smoothstep(.58,.62,p);
  kx = lerp(1.5, 0, t);
  ky = lerp(0.5, -3.5, t);
  kz = lerp(3.8, 2.5, t);
  rX = lerp(-.15, -Math.PI*.25, t);
  rY = lerp(.3, 0, t);
  rZ = lerp(-Math.PI*.08, -Math.PI*.5, t);
  // trigger shatter on crossing 0.6
  if(p > 0.60 && !S.shatterFired) fireShatter();
} else if(p < 0.78){
  // Beat 7: rest in top-right, small (works grid takes center)
  const t = smoothstep(.62,.78,p);
  kx = lerp(0, 3.5, t);
  ky = lerp(-3.5, 2.0, t);
  kz = lerp(2.5, 8.0, t);
  rX = lerp(-Math.PI*.25, .1, t);
  rY = lerp(0, -.3, t);
  rZ = lerp(-Math.PI*.5, -Math.PI*.2, t);
} else {
  // Beat 8: planted upright in dawn foreground
  const t = smoothstep(.78,.94,p);
  kx = lerp(3.5, -2.5, t);
  ky = lerp(2.0, -.8, t);
  kz = lerp(8.0, 3.5, t);
  rX = lerp(.1, -.1, t);
  rY = lerp(-.3, .2, t);
  rZ = lerp(-Math.PI*.2, -Math.PI*.48, t); // blade tip up
}

KAT.position.set(kx + S.nx*.03, ky + S.ny*.03, kz);
KAT.rotation.set(rX, rY, rZ);

// Edge accent — glows hotter through cloud + dawn
edgeAccent.intensity = smoothstep(.20,.50,p)*1.2 + (smoothstep(.82,.95,p))*.8;
edgeAccent.position.set(KAT.position.x, KAT.position.y, KAT.position.z + 0.4);

// Emissive blade pulse
if(KAT.userData.meshes){
  const eW = smoothstep(.30, .60, p)*.5 + smoothstep(.82,.95,p)*.3;
  KAT.userData.meshes.forEach(m => {
    if(m.material?.emissive){
      const col = m.material.color;
      const b = (col.r+col.g+col.b)/3;
      if(b < 0.18){
        m.material.emissive.setRGB(eW*.3, eW*.05, eW*.0);
      }
    }
  });
}

// Moon light activates during dawn
moonL.intensity = smoothstep(.82,.94,p)*.9;
```

}

// ─── Stage theme switch (light on impact, dawn later) ───
const stage = $(‘stage’);
toggleClass(stage, ‘-dawn’, p > 0.78);

// ─── Kanji + ghost ───
toggleClass($(‘kanji-1’), ‘-on’, p < 0.10);
toggleClass($(‘fg-type’), ‘-on’, p < 0.30);
toggleClass($(‘fg-type’), ‘-filled’, p > 0.10);

// ─── Captions ───
toggleClass($(‘cap-1’), ‘-on’, p < 0.10);
toggleClass($(‘cap-2’), ‘-on’, p > 0.05 && p < 0.20);
toggleClass($(‘cap-3’), ‘-on’, p > 0.20 && p < 0.36);
toggleClass($(‘cap-4’), ‘-on’, p > 0.36 && p < 0.56);
toggleClass($(‘cap-5’), ‘-on’, p > 0.585 && p < 0.62);
toggleClass($(‘cap-6’), ‘-on’, p > 0.62 && p < 0.70);
toggleClass($(‘cap-7’), ‘-on’, p > 0.62 && p < 0.78);
toggleClass($(‘cap-8’), ‘-on’, p > 0.82);

// ─── Beat titles with glitch scramble ───
applyBeatTitle(‘bt-2’, p > 0.10 && p < 0.30);
applyBeatTitle(‘bt-3’, p > 0.28 && p < 0.42);
applyBeatTitle(‘bt-4’, p > 0.44 && p < 0.58);
applyBeatTitle(‘bt-6’, p > 0.64 && p < 0.72);

// ─── Scroll hint ───
toggleClass($(‘scroll-hint’), ‘-on’, p < 0.04);

// ─── Works grid (beat 7) ───
toggleClass($(‘works-intro’), ‘-on’, p > 0.65 && p < 0.78);
toggleClass($(‘works-grid’),  ‘-on’, p > 0.68 && p < 0.78);

// ─── Dawn title + jumper (beat 8) ───
toggleClass($(‘dawn-title’), ‘-on’, p > 0.84);
toggleClass($(‘jumper’), ‘-on’, p > 0.90);

// ─── Narrator dialogue ───
for(let i = 0; i < DIALOGUE.length; i++){
if(p >= DIALOGUE[i].at && i > S.dialogueIdx){
showDialogue(i);
break;
}
}
if(p < DIALOGUE[0].at){
$(‘narrator’).classList.remove(’-on’);
S.dialogueIdx = -1;
}

// ─── Chrome state ───
$(‘scroll-pct’).textContent = Math.round(p*100) + ‘%’;
$(‘progress’).style.width = (p*100) + ‘%’;
$(‘stat-top’).textContent = Math.round(S.smooth);
$(‘stat-run’).textContent = Math.round(p*100);

// Section pill evolves
const sectionName =
p < 0.25 ? ‘Codex’ :
p < 0.45 ? ‘Clouds’ :
p < 0.62 ? ‘Impact’ :
p < 0.80 ? ‘Skill Hub’ : ‘Dawn’;
$(‘pill-section’).textContent = sectionName;
$(‘pill-num’).textContent = Math.min(8, Math.floor(p*8)+1);

// Meta widget
toggleClass($(‘meta-widget’), ‘-on’, p > 0.06);
$(‘mw-section’).textContent = sectionName;
const hour =
p < 0.25 ? ‘Nightfall’ :
p < 0.45 ? ‘Witching’ :
p < 0.62 ? ‘The Break’ :
p < 0.80 ? ‘First Light’ : ‘Dawn’;
$(‘mw-hour’).textContent = hour;

// Chromatic aberration on volatile moments
toggleClass($(‘chromatic’), ‘-on’, (p > 0.44 && p < 0.62) || (p > 0.90 && p < 0.95));
}

function applyBeatTitle(id, on){
const el = $(id);
if(!el) return;
if(on){
if(!el.classList.contains(’-on’)){
el.classList.add(’-on’);
runScramble(el, el.dataset.target || el.innerHTML);
}
} else {
el.classList.remove(’-on’);
}
}

/* ─── Dialogue ─── */
let typingJob = null;
function showDialogue(idx){
if(idx === S.dialogueIdx) return;
S.dialogueIdx = idx;
const d = DIALOGUE[idx];
if(!d) return;
$(‘narrator’).classList.add(’-on’);
$(‘who’).textContent = d.who;
$(‘char-name’).textContent = d.who.includes(‘sumofDanth’) ? ‘YOU’ : d.who.split(’ ’).slice(-1)[0];

if(typingJob) clearInterval(typingJob);
const target = d.text;
let i = 0;
$(‘text’).innerHTML = ‘’;
typingJob = setInterval(()=>{
i++;
let preview = target.slice(0, i);
const open = […preview.matchAll(/<(\w+)[^>]*>/g)].map(m=>m[1]);
const close = […preview.matchAll(/</(\w+)>/g)].map(m=>m[1]);
const unclosed = open.filter(t=>{
const oi = open.indexOf(t);
const ci = close.indexOf(t);
return oi !== -1 && (ci === -1 || ci < oi);
});
let display = preview;
unclosed.forEach(t => display += `</${t}>`);
$(‘text’).innerHTML = display;
if(i >= target.length){ clearInterval(typingJob); typingJob = null; }
}, 22);
}

/* ─── Cursor ─── */
const cursor = $(‘cursor’);
addEventListener(‘mousemove’, e => {
S.mx = e.clientX; S.my = e.clientY;
S.nx = (e.clientX/innerWidth)*2 - 1;
S.ny = -((e.clientY/innerHeight)*2 - 1);
cursor.style.left = e.clientX + ‘px’;
cursor.style.top  = e.clientY + ‘px’;
});
addEventListener(‘mousedown’, () => cursor.classList.add(’-pointer’));
addEventListener(‘mouseup’,   () => cursor.classList.remove(’-pointer’));
document.addEventListener(‘mouseover’, e => {
if(e.target.closest(‘button, .pill, .work-card’)) cursor.classList.add(’-pointer’);
});
document.addEventListener(‘mouseout’, e => {
if(e.target.closest(‘button, .pill, .work-card’)) cursor.classList.remove(’-pointer’);
});

/* ═══════════════════════════════════════════════════════════════
MAIN LOOP
═══════════════════════════════════════════════════════════════ */
function loop(ts){
requestAnimationFrame(loop);
S.dt = Math.min((ts - S.lt)*.001, 0.05);
S.lt = ts;
S.t += S.dt;

S.fpsC++; S.fpsT += S.dt;
if(S.fpsT >= 1){
S.fps = Math.round(S.fpsC/S.fpsT);
$(‘stat-fps’).textContent = S.fps;
S.fpsT = 0; S.fpsC = 0;
}

// smooth scroll lerp
S.smooth += (S.scrollY - S.smooth) * 0.09;
S.progress = Math.min(1, Math.max(0, S.smooth / scrollMax));

updateScene();
drawBg();
drawLandscape();
drawFx();
updateMGlyph();

R.render(SC, CAM);
}

/* ─── Loader ─── */
const ldText = $(‘loader-text’);
const ldBar = $(‘loader-bar’);
const ldPct = $(‘loader-pct’);
const ldStages = [‘Forging · 鍛造’, ‘Tempering · 焼入’, ‘Polishing · 研磨’, ‘Awakening · 覚醒’];
let ldP = 0, ldStage = 0;
const ldI = setInterval(()=>{
ldP += 1.5 + Math.random()*4;
if(ldP > 38) ldP = 38;
ldBar.style.width = ldP + ‘%’;
ldPct.textContent = String(Math.round(ldP)).padStart(3,‘0’) + ’ %’;
if(ldP > 12 && ldStage === 0){ ldStage = 1; ldText.textContent = ldStages[1]; }
if(ldP > 24 && ldStage === 1){ ldStage = 2; ldText.textContent = ldStages[2]; }
if(ldP >= 38) clearInterval(ldI);
}, 110);

function boot(){
ldBar.style.width = ‘100%’;
ldPct.textContent = ‘100 %’;
ldText.textContent = ldStages[3];
setTimeout(()=>{
$(‘loader’).classList.add(’-out’);
S.lt = performance.now();
updateScrollMax();
requestAnimationFrame(loop);
}, 700);
}
const bootPoll = setInterval(()=>{
if(S.modelReady){ clearInterval(bootPoll); boot(); }
}, 100);
setTimeout(()=>{ if(!S.modelReady){ S.modelReady = true; } }, 8000);

updateScrollMax();
window.scrollTo(0, 0);
