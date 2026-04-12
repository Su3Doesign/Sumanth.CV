import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Cursor Parallax ---
const cursor = document.getElementById('custom-cursor');
let mouseX = 0; let mouseY = 0;
let isParallaxActive = true; 

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursor.style.left = `${mouseX}px`; cursor.style.top = `${mouseY}px`;
});

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.08);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// --- Hell Throne Reflection Generator ---
function createHellEnvironmentMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#050000'; ctx.fillRect(0, 0, 1024, 512);
    
    const gradient = ctx.createRadialGradient(512, 256, 10, 512, 256, 400);
    gradient.addColorStop(0, '#ffffff'); 
    gradient.addColorStop(0.1, '#ff3300'); 
    gradient.addColorStop(0.4, '#440000'); 
    gradient.addColorStop(1, '#000000'); 
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = '#ff1100'; ctx.fillRect(480, 150, 64, 200); 
    ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(512, 250, 20, 0, Math.PI * 2); ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
}
const hellEnvMap = createHellEnvironmentMap();

// --- Lighting ---
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 3);
dirLight.position.set(5, 5, 5); scene.add(dirLight);

const hakiLight = new THREE.PointLight(0x8A2BE2, 0, 8); scene.add(hakiLight);
const sweepLight = new THREE.PointLight(0xffffff, 0, 10);
sweepLight.position.set(-5, 0, 4); scene.add(sweepLight);

// --- VFX: Void Embers ---
const voidGeo = new THREE.BufferGeometry();
const voidPos = new Float32Array(1800);
for(let i=0; i<1800; i++) voidPos[i] = (Math.random() - 0.5) * 15;
voidGeo.setAttribute('position', new THREE.BufferAttribute(voidPos, 3));
const voidMat = new THREE.PointsMaterial({ size: 0.02, color: 0xD4AF37, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
const voidParticles = new THREE.Points(voidGeo, voidMat);
scene.add(voidParticles);

// --- VFX: Haki Gas ---
const smokeGeo = new THREE.BufferGeometry();
const smokePos = new Float32Array(600);
for(let i=0; i<600; i++) smokePos[i] = (Math.random() - 0.5) * 2;
smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
const smokeMat = new THREE.PointsMaterial({ size: 0.05, color: 0x8A2BE2, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending });
const hakiSmoke = new THREE.Points(smokeGeo, smokeMat);
scene.add(hakiSmoke);

// --- VFX: Lightning Arcs ---
const lightningMat = new THREE.LineBasicMaterial({ color: 0x9D00FF, transparent: true, opacity: 0 });
const lightningLines = [];
for (let i = 0; i < 3; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
    const line = new THREE.Line(geo, lightningMat);
    scene.add(line); lightningLines.push(line);
}

// --- Load Katana & Force Materials ---
const loader = new GLTFLoader();
let katanaModel; let katanaMaterials = [];

loader.load('models/katana.glb', (gltf) => {
    katanaModel = gltf.scene;
    katanaModel.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.envMap = hellEnvMap;
            child.material.envMapIntensity = 0;
            child.material.color.setHex(0x111111);
            child.material.metalness = 1.0;
            child.material.roughness = 0.15;
            child.material.needsUpdate = true;
            katanaMaterials.push(child.material);
        }
    });
    katanaModel.scale.set(1, 1, 1); katanaModel.position.set(0, 0, 0);
    scene.add(katanaModel);
});

// --- Main Render Loop ---
let targetRotY = 0; let targetRotX = 0;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    const vPos = voidGeo.attributes.position.array;
    for(let i=1; i<1800; i+=3) { vPos[i]+=0.005; if(vPos[i]>5) vPos[i]=-5; }
    voidGeo.attributes.position.needsUpdate = true;
    voidParticles.rotation.y = mouseX * 0.0002; voidParticles.rotation.x = mouseY * 0.0002;

    if (katanaModel) {
        if (isParallaxActive) {
            const nX = (mouseX/window.innerWidth)*2-1; const nY = -(mouseY/window.innerHeight)*2+1;
            targetRotY = nX*0.5; targetRotX = nY*0.2;
            katanaModel.rotation.y += (targetRotY - katanaModel.rotation.y)*0.05;
            katanaModel.rotation.x += (targetRotX - katanaModel.rotation.x)*0.05;
        }

        hakiLight.position.copy(katanaModel.position);
        hakiSmoke.position.copy(katanaModel.position);
        lightningLines.forEach(l => l.position.copy(katanaModel.position));

        // Animate Gas
        if (smokeMat.opacity > 0) {
            const sPos = smokeGeo.attributes.position.array;
            for(let i=0; i<600; i+=3) {
                sPos[i+1]+=0.01; sPos[i]+=Math.sin(time*2+i)*0.01;
                if(sPos[i+1]>2) { sPos[i+1]=-2; sPos[i]=(Math.random()-0.5)*0.5; }
            }
            smokeGeo.attributes.position.needsUpdate = true;
        }

        // Animate Lightning
        if (lightningLines[0].material.opacity > 0 && Math.floor(time*20)%2===0) {
            lightningLines.forEach(line => {
                const pos = line.geometry.attributes.position.array;
                let cY = -2;
                for(let i=0; i<18; i+=3) {
                    pos[i]=(Math.random()-0.5)*1.5; pos[i+1]=cY; pos[i+2]=(Math.random()-0.5)*1.5; cY+=0.8;
                }
                line.geometry.attributes.position.needsUpdate = true;
            });
        }

        // Random Haki Surge
        if (Math.random() > 0.98) {
            gsap.to(hakiLight, { intensity: 8, duration: 0.1, yoyo: true, repeat: 1 });
            if (isParallaxActive) {
                gsap.to(smokeMat, { opacity: 0.5, duration: 0.2, yoyo: true, repeat: 1 });
                lightningLines.forEach(l => l.material.opacity = 1);
            }
        } else {
            hakiLight.intensity = Math.max(0, hakiLight.intensity - 0.2);
            if (isParallaxActive) {
                smokeMat.opacity = Math.max(0.1, smokeMat.opacity - 0.02);
                lightningLines.forEach(l => l.material.opacity = 0);
            }
        }
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Dynamic Swipe Geometry Logic ---
let isDragging = false; let sX = 0; let sY = 0;
const pCont = document.getElementById('paper-container');
const sFlash = document.getElementById('slice-flash');

pCont.addEventListener('mousedown', (e) => { isDragging=true; sX=e.clientX; sY=e.clientY; cursor.style.transform="translate(-50%,-50%) scale(0.5)"; });
pCont.addEventListener('mouseup', (e) => {
    if(!isDragging) return; isDragging=false; cursor.style.transform="translate(-50%,-50%) scale(1)";
    if(Math.hypot(e.clientX-sX, e.clientY-sY)>150) triggerSlice(sX, sY, e.clientX, e.clientY);
});

function createEmbers(x,y) {
    const c = document.getElementById('embers-container');
    for(let i=0; i<20; i++) {
        const e = document.createElement('div'); e.className='ember'; e.style.left=`${x+(Math.random()-0.5)*100}px`; e.style.top=`${y+(Math.random()-0.5)*100}px`; c.appendChild(e);
        gsap.to(e, { x:(Math.random()-0.5)*200, y:(Math.random()-0.5)*200-100, opacity:1, duration:Math.random()*0.5+0.5, onComplete:()=>gsap.to(e, {opacity:0, duration:0.5, onComplete:()=>e.remove()}) });
    }
}

function triggerSlice(x1, y1, x2, y2) {
    pCont.style.pointerEvents = "none";
    const angle = Math.atan2(y2-y1, x2-x1); const mX = (x1+x2)/2; const mY = (y1+y2)/2;
    const w = Math.max(window.innerWidth, window.innerHeight)*1.5;
    
    gsap.set(sFlash, { x: mX-(w/2), y: mY-20, rotation: angle*(180/Math.PI), width: w, opacity: 1 });
    createEmbers(mX, mY);

    const d=3000;
    const lX1=mX+Math.cos(angle)*d; const lY1=mY+Math.sin(angle)*d;
    const lX2=mX-Math.cos(angle)*d; const lY2=mY-Math.sin(angle)*d;
    
    const pAT=angle-(Math.PI/2); const tX3=lX2+Math.cos(pAT)*d; const tY3=lY2+Math.sin(pAT)*d; const tX4=lX1+Math.cos(pAT)*d; const tY4=lY1+Math.sin(pAT)*d;
    const pAB=angle+(Math.PI/2); const bX3=lX2+Math.cos(pAB)*d; const bY3=lY2+Math.sin(pAB)*d; const bX4=lX1+Math.cos(pAB)*d; const bY4=lY1+Math.sin(pAB)*d;

    const pT=document.getElementById('paper-top'); const pB=document.getElementById('paper-bottom');
    pT.style.clipPath = `polygon(${lX1}px ${lY1}px, ${lX2}px ${lY2}px, ${tX3}px ${tY3}px, ${tX4}px ${tY4}px)`;
    pB.style.clipPath = `polygon(${lX1}px ${lY1}px, ${lX2}px ${lY2}px, ${bX3}px ${bY3}px, ${bX4}px ${bY4}px)`;

    const tl = gsap.timeline();
    tl.fromTo(sFlash, { scaleX:0 }, { scaleX:1, duration:0.2, ease:"power4.inOut" })
      .to(sFlash, { opacity:0, duration:0.4, ease:"power2.out" }, "+=0.1")
      .to(pT, { x:Math.cos(pAT)*600, y:Math.sin(pAT)*600, rotateX:Math.cos(angle)*15, rotateY:Math.sin(angle)*15, duration:1.5, ease:"power3.inOut" }, "-=0.3")
      .to(pB, { x:Math.cos(pAB)*600, y:Math.sin(pAB)*600, rotateX:-Math.cos(angle)*15, rotateY:-Math.sin(angle)*15, duration:1.5, ease:"power3.inOut" }, "<")
      .to("#void-content", { opacity:1, duration:1 }, "-=0.5");
}

// --- ACT 2: Horizontal Hell Zoom & Haki Overdrive ---
const continueBtn = document.getElementById('continue-text');

continueBtn.addEventListener('click', () => {
    isParallaxActive = false; continueBtn.style.pointerEvents = "none";
    const tl = gsap.timeline();
    tl.to("#void-content", { opacity: 0, duration: 0.5 });

    // Haki VFX goes into Overdrive
    tl.to(smokeMat, { opacity: 0.8, duration: 2, ease: "power2.in" }, "<");
    lightningLines.forEach(l => l.material.opacity = 1);

    // Zoom and Rotate Blade (x:1.5 centers the Tsuba, z:4.2 is right in the camera's face)
    tl.to(katanaModel.position, { x: 1.5, y: 0, z: 4.2, duration: 2.5, ease: "power3.inOut" }, "-=0.2")
      .to(katanaModel.rotation, { x: 0, y: Math.PI/2, z: 0.1, duration: 2.5, ease: "power3.inOut" }, "<"); 

    // Ignite Hell Reflection
    katanaMaterials.forEach(mat => tl.to(mat, { envMapIntensity: 2.5, duration: 2.5, ease: "power2.in" }, "<"));

    // Shing Gleam Sweep
    tl.to(sweepLight, { intensity: 20, duration: 0.5 }, "-=1.0")
      .to(sweepLight.position, { x: 5, duration: 1.5, ease: "power1.inOut" }, "<")
      .to(sweepLight, { intensity: 0, duration: 0.8 }, "-=0.2");
});
