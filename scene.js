/* ═══════════════════════════════════════════════════════════════
   sumanth.D© — MYTHIC SCENE ENGINE (v4)
═══════════════════════════════════════════════════════════════ */

(() => {
const $ = id => document.getElementById(id);

/* ═══════════ STATE ═══════════ */
const S = {
  scrollY:0, smooth:0, progress:0,
  vw:innerWidth, vh:innerHeight, dpr:Math.min(devicePixelRatio||1, 2),
  mx:innerWidth/2, my:innerHeight/2, nx:0, ny:0,
  t:0, lt:0, dt:0, fps:60, fpsT:0, fpsC:0,
  dialogueIdx:-1, mugenVisible:false, shatterFired:false,
  inkMode:false, awakenedScroll:0,
  lightning:[], lightningT:0, inkClouds:[]
};

const WORKS = [
  { no:'01', year:'2025', title:'Fudō Myōō',       role:'Environment · Hard-Surface', desc:'A sanctum of still fire. Shingon iconography rendered as space.' },
  { no:'02', year:'2025', title:'Midea · Canada',  role:'Graphic Design',             desc:'Five sub-brands. Toronto, March through July.' },
  { no:'03', year:'2024', title:'Kōhaku',          role:'3D · Concept',               desc:'Silent koi. A study in subsurface and lanternlight.' },
  { no:'04', year:'2024', title:'KD Displays',     role:'Retail Environments',        desc:'Environmental graphics for Home Depot Canada lines.' },
  { no:'05', year:'2024', title:'Onibi',           role:'Hard-Surface',               desc:'Wandering-flame lanterns. Soft emissives, hand-tuned.' },
  { no:'06', year:'2023', title:'Investohome',     role:'Brand · Identity',           desc:'Full identity system for a Toronto real-estate venture.' },
  { no:'07', year:'2023', title:'The Iron Garden', role:'Environment · Coursework',   desc:'Rust and cherry branches. A study in rain memory.' }
];

const DIALOGUE = [
  { at:0.07, who:'SENSEI MUGEN', text:'<em>Hmm.</em> So you finally crossed the line. Sit, traveler — the road is long, and the blade is older than your grandfather.' },
  { at:0.14, who:'SENSEI MUGEN', text:'I am <strong>Mugen</strong>, ✦ keeper of unfinished worlds. This katana has cut the dreams of seventeen apprentices. Each returned home a craftsman.' },
  { at:0.21, who:'SENSEI MUGEN', text:'But none — <em>none</em> — became a builder of worlds. Few inherit the will. Fewer still answer it.' },
  { at:0.28, who:'SENSEI MUGEN', text:'Tell me, then. <strong>What world do you intend to build?</strong>' },
  { at:0.34, who:'sumanth.D',    text:'<em>The one I cannot find on any map.</em>' },
  { at:0.42, who:'SENSEI MUGEN', text:'Good. Then the blade goes with you. Through cloud. Through thunder. Through the breaking of this old world.' },
  { at:0.54, who:'SENSEI MUGEN', text:'They will tell you the sky has an edge. They are wrong. <em>You were made to find out.</em>' },
  { at:0.66, who:'SENSEI MUGEN', text:"Every shard you see was once the shape of somebody else's dream. Step over them. The self is a hill with a sea behind it." },
  { at:0.78, who:'SENSEI MUGEN', text:'These are your works. Not trophies — <em>evidence</em>. Proof the hand moves when the will points.' },
  { at:0.88, who:'SENSEI MUGEN', text:'Now look up. The dawn does not arrive. It is <em>answered</em>.' },
  { at:0.95, who:'SENSEI MUGEN', text:'Go on, builder. 世界を創る者. The world is waiting for yours.' },
];

/* ═══════════ CANVAS SETUP ═══════════ */
const atmos = $('atmos'); const ax = atmos ? atmos.getContext('2d') : null;
const inkC = $('ink-layer'); const ix = inkC ? inkC.getContext('2d') : null;
function resizeCanvases() {
  S.vw = innerWidth; S.vh = innerHeight;
  if(atmos && ax){ atmos.width = S.vw * S.dpr; atmos.height = S.vh * S.dpr; ax.setTransform(S.dpr,0,0,S.dpr,0,0); }
  if(inkC && ix){ inkC.width = S.vw * S.dpr; inkC.height = S.vh * S.dpr; ix.setTransform(S.dpr,0,0,S.dpr,0,0); }
}
window.addEventListener('resize', resizeCanvases); resizeCanvases();

/* ═══════════ THREE.JS ENGINE ═══════════ */
let R, SC, CAM, KAT, keyL, rimL, flashL, hemiLight;
const assets = { images:['assets/bg-hero.png','assets/bg-clouds.png','assets/bg-hilltop.png','assets/bg-dawn.png'], gltf:'models/katana.glb' };

function initThree() {
  const canvasEl = $('three'); if(!canvasEl) return;
  R = new THREE.WebGLRenderer({ canvas:canvasEl, antialias:true, alpha:true, powerPreference:'high-performance' });
  R.setPixelRatio(S.dpr); R.setSize(S.vw, S.vh);
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.1; R.outputColorSpace = THREE.SRGBColorSpace;
  
  SC = new THREE.Scene();
  CAM = new THREE.PerspectiveCamera(36, S.vw/S.vh, 0.1, 100); CAM.position.set(0, 0, 5);

  hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.4); SC.add(hemiLight);
  keyL = new THREE.DirectionalLight(0xffffff, 1.2); keyL.position.set(-3, 5, 4); SC.add(keyL);
  rimL = new THREE.DirectionalLight(0xff6030, 1.5); rimL.position.set(2, -2, -4); SC.add(rimL);
  flashL = new THREE.PointLight(0xddeeff, 0, 15); flashL.position.set(0, 4, 2); SC.add(flashL);

  KAT = new THREE.Group(); SC.add(KAT);

  // Use RoomEnvironment as built-in HDRI for instant photorealism without external files
  const pmremGenerator = new THREE.PMREMGenerator(R);
  pmremGenerator.compileEquirectangularShader();
  SC.environment = pmremGenerator.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

  runStrictPreload();
}

function runStrictPreload() {
  const pImages = Promise.all(assets.images.map(src => new Promise(res => { const img = new Image(); img.onload = img.onerror = res; img.src = src; })));
  
  const pGLTF = new Promise(res => {
    const loader = (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader === 'function') ? new THREE.GLTFLoader() : null;
    if(!loader){ console.warn("GLTFLoader missing."); return res(null); }
    loader.load(assets.gltf, gltf => {
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const scale = 5.4 / Math.max(box.getSize(new THREE.Vector3()).x, 0.01);
      m.scale.setScalar(scale);
      m.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
      
      m.traverse(o => {
        if(o.isMesh && o.material){
          o.material.envMapIntensity = 2.0; // Boost HDRI reflection
          o.material.metalness = 1.0;
          o.material.roughness = 0.15;
          o.material.needsUpdate = true;
        }
      });
      KAT.add(m); KAT.userData.model = m; res(true);
    }, xhr => { if(xhr.total>0) updateLoader(xhr.loaded/xhr.total * 80); }, () => res(false));
  });

  Promise.all([pImages, pGLTF]).then(() => { updateLoader(100); setTimeout(bootSequence, 600); });
}

function updateLoader(pct){
  const bar = $('loader-bar'); const txt = $('loader-pct');
  if(bar) bar.style.width = `${pct}%`;
  if(txt) txt.textContent = `${Math.round(pct).toString().padStart(3, '0')} %`;
}
initThree();

/* ═══════════ BLADE CHOREOGRAPHY (Autonomous) ═══════════ */
function updateKatana() {
  if (!KAT || !KAT.userData.model) return;
  const p = S.progress;
  
  // Independent breathing motion
  const breathY = Math.sin(S.t * 1.5) * 0.04;
  const breathR = Math.cos(S.t * 0.8) * 0.02;

  let tx=0, ty=0, tz=0, rx=0, ry=0, rz=0;

  if (p < 0.1) {
    tx = 0; ty = breathY; tz = 0.5 - (p*10);
    rx = -Math.PI/4 + breathR; ry = (p*10)*Math.PI; rz = -Math.PI/5;
  } else if (p < 0.4) {
    const local = (p - 0.1) / 0.3;
    tx = Math.sin(local * Math.PI) * 1.5; ty = breathY; tz = -2 + Math.sin(local * Math.PI) * 2;
    rx = 0.2; ry = Math.PI + (local * Math.PI * 2); rz = -Math.PI/8;
  } else if (p < 0.6) {
    const local = (p - 0.4) / 0.2;
    tx = -1.5 + (local * 3); ty = 1 - (local * 2) + breathY; tz = -1;
    rx = local * Math.PI; ry = Math.PI/2; rz = -Math.PI/4 + (local * Math.PI/2);
  } else if (p < 0.8) {
    tx = 1.5; ty = -1 + breathY; tz = -2;
    rx = -Math.PI/2; ry = 0; rz = -Math.PI/4;
    if(p > 0.66 && !S.shatterFired) fireShatter();
  } else {
    tx = -2.0; ty = -0.5 + breathY; tz = -1.5;
    rx = -0.1; ry = breathR; rz = -Math.PI/2.2;
  }

  // Smooth lerping for heavy sword feel
  KAT.position.lerp(new THREE.Vector3(tx + (S.nx*0.05), ty + (S.ny*0.05), tz), 0.08);
  KAT.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), 0.08);

  // Light color shifts
  if(S.inkMode) { keyL.color.setHex(0xffffff); rimL.color.setHex(0x111111); hemiLight.intensity=0.1; }
  else if(p < 0.38){ keyL.color.setHex(0xffe0b8); rimL.color.setHex(0xff6030); hemiLight.intensity=0.4; }
  else if(p < 0.62){ keyL.color.setHex(0xffc890); rimL.color.setHex(0xc83c28); hemiLight.intensity=0.5; }
  else if(p < 0.96){ keyL.color.setHex(0xb8cde8); rimL.color.setHex(0x3a4a6a); hemiLight.intensity=0.2; }
  else { keyL.color.setHex(0xffd890); rimL.color.setHex(0xffa040); hemiLight.intensity=0.6; }
}

/* ═══════════ FRACTAL THUNDER ═══════════ */
function triggerThunder() {
  if (S.inkMode) return;
  const startX = innerWidth * (0.2 + Math.random() * 0.6);
  S.lightning.push({
    life: 1.0,
    branches: generateFractal(startX, -50, startX + (Math.random() - 0.5) * 400, innerHeight * 0.8, 5)
  });
  if(flashL) flashL.intensity = 15;
}
function generateFractal(x1, y1, x2, y2, depth) {
  if (depth === 0) return [[x1, y1, x2, y2]];
  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 80 * depth;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 80 * depth;
  let lines = generateFractal(x1, y1, midX, midY, depth - 1).concat(generateFractal(midX, midY, x2, y2, depth - 1));
  if (Math.random() < 0.4) {
    const forkX = midX + (Math.random() - 0.5) * 150; const forkY = midY + 100 + Math.random() * 100;
    lines = lines.concat(generateFractal(midX, midY, forkX, forkY, depth - 2));
  }
  return lines;
}
function renderThunder() {
  if (!ax) return;
  if (flashL && flashL.intensity > 0) flashL.intensity *= 0.8; // Decay 3D light
  S.lightning = S.lightning.filter(l => l.life > 0);
  S.lightning.forEach(l => {
    l.life -= 0.06; const alpha = Math.max(0, l.life);
    ax.save(); ax.lineCap = 'round';
    // Core
    ax.shadowColor = '#fff'; ax.shadowBlur = 15; ax.strokeStyle = `rgba(255, 255, 255, ${alpha})`; ax.lineWidth = 3;
    l.branches.forEach(seg => { ax.beginPath(); ax.moveTo(seg[0], seg[1]); ax.lineTo(seg[2], seg[3]); ax.stroke(); });
    // Glow
    ax.shadowBlur = 0; ax.strokeStyle = `rgba(180, 100, 255, ${alpha * 0.4})`; ax.lineWidth = 8;
    l.branches.forEach(seg => { ax.beginPath(); ax.moveTo(seg[0], seg[1]); ax.lineTo(seg[2], seg[3]); ax.stroke(); });
    ax.restore();
  });
}

/* ═══════════ THE AWAKENING (Reverse Ink Scroll) ═══════════ */
const jumperBtn = $('jumper');
if(jumperBtn) jumperBtn.addEventListener('click', triggerAwakening);

function triggerAwakening() {
  S.inkMode = !S.inkMode;
  document.body.classList.toggle('awakened', S.inkMode);
  const stage = $('stage'); if(stage) stage.classList.toggle('-ink', S.inkMode);
  
  if(S.inkMode) {
    S.awakenedScroll = S.scrollY;
    for(let i=0; i<40; i++) {
      S.inkClouds.push({
        x: innerWidth/2 + (Math.random()-0.5)*100, y: innerHeight/2 + (Math.random()-0.5)*100,
        vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12,
        r: 10 + Math.random()*40, life: 1.0, growth: 1.04 + Math.random()*0.04
      });
    }
  }
}
function renderInkDomain() {
  if (!ix || !S.inkMode) { if(ix) ix.clearRect(0,0, S.vw, S.vh); S.inkClouds.length=0; return; }
  
  ix.fillStyle = 'rgba(245, 237, 224, 0.08)'; // Washi bleed fade
  ix.fillRect(0, 0, S.vw, S.vh);
  
  S.inkClouds = S.inkClouds.filter(c => c.life > 0);
  S.inkClouds.forEach(c => {
    c.x += c.vx; c.y += c.vy; c.r *= c.growth; c.life -= 0.015;
    ix.beginPath();
    const grad = ix.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    grad.addColorStop(0, `rgba(10, 9, 6, ${c.life})`); grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ix.fillStyle = grad; ix.arc(c.x, c.y, c.r, 0, Math.PI*2); ix.fill();
  });

  // Track reverse scroll and draw sumi-e lines
  const scrollOffset = (S.scrollY - S.awakenedScroll) * 0.5;
  ix.strokeStyle = `rgba(10, 9, 6, ${0.05 + Math.sin(S.t)*0.02})`;
  ix.lineWidth = 2 + Math.sin(S.t*2);
  ix.beginPath(); ix.moveTo(-20, S.vh/2 - scrollOffset);
  for(let x=0; x<S.vw+40; x+=40) { ix.lineTo(x, S.vh/2 - scrollOffset + Math.sin((x/120) + S.t*2)*40); }
  ix.stroke();
}

/* ═══════════ SCROLL & PARALLAX ═══════════ */
addEventListener('scroll', () => { S.scrollY = scrollY; }, {passive:true});
addEventListener('mousemove', e => {
  S.mx = e.clientX; S.my = e.clientY;
  S.nx += (((e.clientX/S.vw)*2 - 1) - S.nx) * 0.1;
  S.ny += ((-((e.clientY/S.vh)*2 - 1)) - S.ny) * 0.1;
  const c = $('cursor'); if(c){ c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px'; }
});
document.addEventListener('mouseover', e => { if(e.target.closest('[data-cursor="hover"], button, .sh-row, .ch-item, .chapter-pill')) $('cursor')?.classList.add('-hover'); });
document.addEventListener('mouseout', e => { if(e.target.closest('[data-cursor="hover"], button, .sh-row, .ch-item, .chapter-pill')) $('cursor')?.classList.remove('-hover'); });

const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3 - 2*t); };
const lerp = (a, b, t) => a + (b-a)*t;
const toggle = (el, cls, on) => { if(el) on ? el.classList.add(cls) : el.classList.remove(cls); };

let scrollMax = 1;
function updateScrollMax() { scrollMax = Math.max(1, document.documentElement.scrollHeight - S.vh); }

function updateBgParallax() {
  const p = S.progress;
  const wHero    = smoothstep(0.02, 0.10, p) * (1 - smoothstep(0.36, 0.44, p));
  const wClouds  = smoothstep(0.36, 0.44, p) * (1 - smoothstep(0.60, 0.66, p));
  const wImpact  = smoothstep(0.60, 0.64, p) * (1 - smoothstep(0.70, 0.76, p));
  const wPaper   = smoothstep(0.68, 0.76, p) * (1 - smoothstep(0.83, 0.88, p));
  const wHilltop = smoothstep(0.82, 0.88, p) * (1 - smoothstep(0.94, 0.97, p));
  const wDawn    = smoothstep(0.93, 0.97, p);

  setLayerOpacity($('bg-hero'), wHero); setLayerOpacity($('bg-clouds'), wClouds); setLayerOpacity($('bg-impact'), wImpact);
  setLayerOpacity($('bg-paper'), wPaper); setLayerOpacity($('bg-hilltop'), wHilltop); setLayerOpacity($('bg-dawn'), wDawn);

  setParallax($('bg-hero'), p, 0.00, 0.38, 1.05, 1.12);
  setParallax($('bg-clouds'), p, 0.36, 0.62, 1.02, 1.10);
  setParallax($('bg-paper'), p, 0.68, 0.88, 1.00, 1.04);
  setParallax($('bg-hilltop'), p, 0.82, 0.97, 1.04, 1.12);
  setParallax($('bg-dawn'), p, 0.93, 1.00, 1.02, 1.08);
}
function setLayerOpacity(el, w){ if(el){ if(w > 0.01){ el.style.opacity = Math.min(1, w); el.classList.add('-on'); } else { el.style.opacity = 0; el.classList.remove('-on'); }}}
function setParallax(el, p, start, end, minScale, maxScale){
  if(!el) return;
  const local = smoothstep(start, end, p); const scale = lerp(minScale, maxScale, local);
  el.style.transform = `translate3d(${S.nx*15}px, ${S.ny*15 + local*-20}px, 0) scale(${scale.toFixed(4)})`;
}

/* ═══════════ UI & LOGIC ═══════════ */
function buildSkillHub(){
  const host = $('skillhub-right');
  if(host) host.innerHTML = WORKS.map(w => `<div class="sh-row" data-cursor="hover" data-invert="true"> <div class="sh-num">N° ${w.no}</div> <div class="sh-title-row">${w.title}</div> <div class="sh-role">${w.role}</div> <div class="sh-year">${w.year}</div> <div class="sh-desc">${w.desc}</div> </div>`).join('');
}
buildSkillHub();

const KANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const KANJI = '刀剣魂創造夢幻覚醒風炎月海';
function scrambleChar(){ const src = Math.random() < 0.5 ? KANA : KANJI; return src[Math.floor(Math.random()*src.length)]; }
function runScramble(el){
  if(!el || el._scrambling || !el.dataset.target) return;
  el._scrambling = true;
  const lines = el.dataset.target.split('|'); const plainLines = lines.map(l => l.replace(/<[^>]+>/g, ''));
  let step = 0; const steps = 14;
  const tick = () => {
    step++; const prog = step/steps;
    if(step >= steps){ el.innerHTML = lines.join('<br>'); el._scrambling = false; return; }
    el.innerHTML = lines.map((l, li) => {
      const p = plainLines[li], r = Math.floor(p.length * prog);
      return p.slice(0, r) + Array(Math.min(p.length - r, 5)).fill(0).map(scrambleChar).join('');
    }).join('<br>');
    setTimeout(tick, 50);
  }; tick();
}

let typingJob = null;
function showDialogue(idx){
  if(idx === S.dialogueIdx) return; S.dialogueIdx = idx;
  const d = DIALOGUE[idx]; if(!d) return;
  if(!S.mugenVisible && $('mugen')){ $('mugen').classList.add('-on'); S.mugenVisible = true; }
  if($('mb-who')) $('mb-who').textContent = d.who;
  if(typingJob) clearInterval(typingJob);
  let i = 0; if($('mb-text')) $('mb-text').innerHTML = '';
  typingJob = setInterval(() => {
    i++; let pre = d.text.slice(0, i);
    const op = [...pre.matchAll(/<(\w+)[^>]*>/g)].map(m => m[1]), cl = [...pre.matchAll(/<\/\w+>/g)].map(m => m[1]);
    op.filter(t => op.indexOf(t) !== -1 && (cl.indexOf(t) === -1 || cl.indexOf(t) < op.indexOf(t))).forEach(t => pre += `</${t}>`);
    if($('mb-text')) $('mb-text').innerHTML = pre;
    if(i >= d.text.length){ clearInterval(typingJob); typingJob = null; }
  }, 22);
}

function fireShatter(){
  if(S.shatterFired || !$('shatter')) return; S.shatterFired = true; $('shatter').classList.add('-on');
  for(let i=0; i<46; i++){
    const sd = document.createElement('div'); sd.className = 'shard';
    sd.style.clipPath = `polygon(${Array(3+Math.floor(Math.random()*3)).fill(0).map(()=>`${Math.random()*100}% ${Math.random()*100}%`).join(',')})`;
    const sz = 60+Math.random()*180; sd.style.width = sz+'px'; sd.style.height = (sz*(0.5+Math.random()*0.8))+'px';
    sd.style.left = (S.vw*0.5 - sz/2)+'px'; sd.style.top = (S.vh*0.5 - sz/2)+'px';
    $('shatter').appendChild(sd);
    const a = (i/46)*Math.PI*2 + (Math.random()-0.5)*0.6, sp = 260+Math.random()*520, rot = (Math.random()-0.5)*720;
    sd.animate([{transform:'scale(.4)'},{transform:`translate(${Math.cos(a)*sp}px,${Math.sin(a)*sp+360}px) rotate(${rot}deg) scale(.6)`,opacity:0}], {duration:1800+Math.random()*900, easing:'cubic-bezier(.2,.7,.3,1)', fill:'forwards'});
  }
  setTimeout(() => { $('shatter').innerHTML = ''; $('shatter').classList.remove('-on'); }, 3400);
}

function updateBeats(){
  const p = S.progress;
  const b = p < 0.08 ? 1 : p < 0.22 ? 2 : p < 0.38 ? 3 : p < 0.50 ? 4 : p < 0.62 ? 5 : p < 0.72 ? 6 : p < 0.85 ? 7 : p < 0.96 ? 8 : 9;

  toggle($('hero-monogram'), '-on', b === 1);
  toggle($('cap-chapter'), '-on', b <= 2); toggle($('cap-bottom'), '-on', b <= 3); toggle($('cap-folio'), '-on', b === 4 || b === 5);
  toggle($('scroll-hint'), '-on', p < 0.04);
  toggle($('skillhub'), '-on', b === 7);
  toggle($('dawn-title'), '-on', p > 0.93); toggle($('jumper'), '-on', p > 0.94);

  ['bt-sacred','bt-dialogue','bt-ascent','bt-self'].forEach((id, i) => {
    const act = (i===0 && p>0.10 && p<0.24) || (i===1 && p>0.28 && p<0.40) || (i===2 && p>0.44 && p<0.58) || (i===3 && p>0.68 && p<0.78);
    const el = $(id); if(el && act && !el.classList.contains('-on')){ el.classList.add('-on'); runScramble(el); } else if(el && !act) el.classList.remove('-on');
  });

  for(let i=0; i<DIALOGUE.length; i++){ if(p >= DIALOGUE[i].at && i > S.dialogueIdx){ showDialogue(i); break; } }
  if(p < DIALOGUE[0].at && S.mugenVisible){ $('mugen')?.classList.remove('-on'); S.mugenVisible = false; S.dialogueIdx = -1; }

  if($('scroll-pct')) $('scroll-pct').textContent = Math.round(p*100) + '%';
  if($('progress')) $('progress').style.width = (p*100) + '%';
  if($('stat-top')) $('stat-top').textContent = Math.round(S.smooth);
  if($('stat-run')) $('stat-run').textContent = Math.round(p*100);
  if($('ch-label')) $('ch-label').textContent = ['', 'Codex', 'Sacred Tree', 'Dialogue', 'Ascent', 'Thunder', 'Impact', 'Skill Hub', 'Moonlit', 'Dawn'][b] || 'Codex';
  if($('ch-num')) $('ch-num').textContent = String(b).padStart(2, '0');

  toggle($('meta-widget'), '-on', p > 0.08 && p < 0.96);
  if($('mw-hour')) $('mw-hour').textContent = ['', 'Nightfall', 'Dusk', 'Witching', 'Witching', 'The Break', 'Silence', 'Paper Hour', 'Blue Hour', 'Daybreak'][b] || '';
}

/* ═══════════ RENDER LOOP ═══════════ */
function loop(ts) {
  requestAnimationFrame(loop);
  S.dt = Math.min((ts - S.lt)*0.001, 0.05); S.lt = ts; S.t += S.dt;

  S.fpsC++; S.fpsT += S.dt;
  if(S.fpsT >= 1){ if($('stat-fps')) $('stat-fps').textContent = Math.round(S.fpsC/S.fpsT); S.fpsT = 0; S.fpsC = 0; }

  S.smooth += (S.scrollY - S.smooth) * 0.08; S.progress = Math.max(0, Math.min(1, S.smooth / scrollMax));

  if (!S.inkMode) {
    updateBgParallax(); updateKatana(); updateBeats();
    if(ax) ax.clearRect(0,0, S.vw, S.vh);
    if(S.progress > 0.46 && S.progress < 0.62 && Math.random() < 0.03) triggerThunder();
    renderThunder();
    if(R && SC && CAM) R.render(SC, CAM);
  } else {
    renderInkDomain();
  }
}

function bootSequence() {
  const loaderEl = $('loader'); if(loaderEl) loaderEl.classList.add('-out');
  setTimeout(() => { if(loaderEl) loaderEl.remove(); }, 1400);
  S.lt = performance.now(); updateScrollMax(); requestAnimationFrame(loop);
}

$('ch-expand')?.addEventListener('click', e => { const t = e.target.closest('[data-jump]'); if(t) scrollTo({ top: scrollMax * parseFloat(t.dataset.jump), behavior:'smooth' }); });

// Absolute failsafe
setTimeout(() => { if($('loader')) bootSequence(); }, 15000);

})();
