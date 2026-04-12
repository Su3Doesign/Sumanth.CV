import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Custom Cursor Logic ---
const cursor = document.getElementById('custom-cursor');
let mouseX = 0; let mouseY = 0;
let isParallaxActive = true; 

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursor.style.left = `${mouseX}px`; cursor.style.top = `${mouseY}px`;
});

// --- Three.js Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.08);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);
camera.position.z = 5;

// --- Procedural Hell Throne Reflection Map ---
// This generates an abstract fiery room to reflect off the blade
function createHellEnvironmentMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Deep dark background
    ctx.fillStyle = '#050000'; 
    ctx.fillRect(0, 0, 1024, 512);
    
    // The fiery core/throne gradient
    const gradient = ctx.createRadialGradient(512, 256, 10, 512, 256, 400);
    gradient.addColorStop(0, '#ffffff'); // Blinding center
    gradient.addColorStop(0.1, '#ff3300'); // Intense orange/red
    gradient.addColorStop(0.4, '#440000'); // Deep blood red
    gradient.addColorStop(1, '#000000'); // Fade to black
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);

    // Abstract vertical shapes (pillars/throne back)
    ctx.fillStyle = '#ff1100';
    ctx.fillRect(480, 150, 64, 200); 
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath(); ctx.arc(512, 250, 20, 0, Math.PI * 2); ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
}
const hellEnvMap = createHellEnvironmentMap();

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); 
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const hakiLight = new THREE.PointLight(0x8A2BE2, 0, 8); 
scene.add(hakiLight);

// The Sweep Light (For the *Shing* gleam in Act 2)
const sweepLight = new THREE.PointLight(0xffffff, 0, 10);
sweepLight.position.set(-5, 0, 4); // Starts on the left
scene.add(sweepLight);

// --- The Interactive Void (Forge Embers) ---
const voidParticlesGeometry = new THREE.BufferGeometry();
const voidParticlesCount = 600;
const voidPosArray = new Float32Array(voidParticlesCount * 3);
for(let i = 0; i < voidParticlesCount * 3; i++) {
    voidPosArray[i] = (Math.random() - 0.5) * 15;
}
voidParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(voidPosArray, 3));
const voidParticlesMaterial = new THREE.PointsMaterial({
    size: 0.02, color: 0xD4AF37, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
});
const voidParticles = new THREE.Points(voidParticlesGeometry, voidParticlesMaterial);
scene.add(voidParticles);

// --- Load The Katana & Force Mirror Material ---
const loader = new GLTFLoader();
let katanaModel;
let katanaMaterials = []; // We save the materials to animate them later

loader.load('models/katana.glb', (gltf) => {
    katanaModel = gltf.scene;
    
    // Traverse the model to hijack the materials
    katanaModel.traverse((child) => {
        if (child.isMesh && child.material) {
            // Apply the Hell Reflection Map
            child.material.envMap = hellEnvMap;
            child.material.envMapIntensity = 0; // Hidden during Act 1
            
            // Force it to be a dark, highly reflective surface
            child.material.color.setHex(0x111111); // Dark blade
            child.material.metalness = 1.0; // 100% Metal
            child.material.roughness = 0.15; // Very smooth, mirror-like
            child.material.needsUpdate = true;
            
            katanaMaterials.push(child.material);
        }
    });

    katanaModel.scale.set(1, 1, 1); 
    katanaModel.position.set(0, 0, 0);
    scene.add(katanaModel);
});

// --- Animation Loop ---
let targetRotationY = 0; let targetRotationX = 0;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Void Embers
    const voidPos = voidParticlesGeometry.attributes.position.array;
    for(let i = 1; i < voidParticlesCount * 3; i += 3) {
        voidPos[i] += 0.005; 
        if (voidPos[i] > 5) voidPos[i] = -5; 
    }
    voidParticlesGeometry.attributes.position.needsUpdate = true;
    voidParticles.rotation.y = mouseX * 0.0002;
    voidParticles.rotation.x = mouseY * 0.0002;

    if (katanaModel && isParallaxActive) {
        const normX = (mouseX / window.innerWidth) * 2 - 1;
        const normY = -(mouseY / window.innerHeight) * 2 + 1;
        targetRotationY = normX * 0.5; 
        targetRotationX = normY * 0.2; 
        
        katanaModel.rotation.y += (targetRotationY - katanaModel.rotation.y) * 0.05;
        katanaModel.rotation.x += (targetRotationX - katanaModel.rotation.x) * 0.05;
        hakiLight.position.copy(katanaModel.position);

        if (Math.random() > 0.98) {
            gsap.to(hakiLight, { intensity: 8, duration: 0.1, yoyo: true, repeat: 1 });
        } else {
            hakiLight.intensity = Math.max(0, hakiLight.intensity - 0.2);
        }
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Act 1: Dynamic Slice Logic ---
let isDragging = false; let startX = 0; let startY = 0;
const paperContainer = document.getElementById('paper-container');
const sliceFlash = document.getElementById('slice-flash');

paperContainer.addEventListener('mousedown', (e) => {
    isDragging = true; startX = e.clientX; startY = e.clientY;
    cursor.style.transform = "translate(-50%, -50%) scale(0.5)"; 
});

paperContainer.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    cursor.style.transform = "translate(-50%, -50%) scale(1)";
    const endX = e.clientX; const endY = e.clientY;
    if (Math.hypot(endX - startX, endY - startY) > 150) triggerSlice(startX, startY, endX, endY);
});

function createEmbers(x, y) {
    const container = document.getElementById('embers-container');
    for(let i = 0; i < 20; i++) {
        const ember = document.createElement('div');
        ember.className = 'ember';
        ember.style.left = `${x + (Math.random() - 0.5) * 100}px`;
        ember.style.top = `${y + (Math.random() - 0.5) * 100}px`;
        container.appendChild(ember);
        gsap.to(ember, {
            x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 - 100, 
            opacity: 1, duration: Math.random() * 0.5 + 0.5,
            onComplete: () => gsap.to(ember, { opacity: 0, duration: 0.5, onComplete: () => ember.remove() })
        });
    }
}

function triggerSlice(sx, sy, ex, ey) {
    paperContainer.style.pointerEvents = "none";
    const angle = Math.atan2(ey - sy, ex - sx); 
    const angleDeg = angle * (180 / Math.PI);
    const midX = (sx + ex) / 2; const midY = (sy + ey) / 2;
    const sliceWidth = Math.max(window.innerWidth, window.innerHeight) * 1.5;

    gsap.set(sliceFlash, { x: midX - (sliceWidth / 2), y: midY - 15, rotation: angleDeg, width: sliceWidth, opacity: 1 });
    createEmbers(midX, midY);

    const dist = 3000;
    const lX1 = midX + Math.cos(angle) * dist; const lY1 = midY + Math.sin(angle) * dist;
    const lX2 = midX - Math.cos(angle) * dist; const lY2 = midY - Math.sin(angle) * dist;
    
    const pAT = angle - (Math.PI / 2);
    const tX3 = lX2 + Math.cos(pAT) * dist; const tY3 = lY2 + Math.sin(pAT) * dist;
    const tX4 = lX1 + Math.cos(pAT) * dist; const tY4 = lY1 + Math.sin(pAT) * dist;
    
    const pAB = angle + (Math.PI / 2);
    const bX3 = lX2 + Math.cos(pAB) * dist; const bY3 = lY2 + Math.sin(pAB) * dist;
    const bX4 = lX1 + Math.cos(pAB) * dist; const bY4 = lY1 + Math.sin(pAB) * dist;

    const pTop = document.getElementById('paper-top');
    const pBot = document.getElementById('paper-bottom');
    pTop.style.clipPath = `polygon(${lX1}px ${lY1}px, ${lX2}px ${lY2}px, ${tX3}px ${tY3}px, ${tX4}px ${tY4}px)`;
    pBot.style.clipPath = `polygon(${lX1}px ${lY1}px, ${lX2}px ${lY2}px, ${bX3}px ${bY3}px, ${bX4}px ${bY4}px)`;

    const tl = gsap.timeline();
    tl.fromTo(sliceFlash, { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: "power4.inOut" })
      .to(sliceFlash, { opacity: 0, duration: 0.4, ease: "power2.out" }, "+=0.1")
      .to(pTop, { x: Math.cos(pAT) * 600, y: Math.sin(pAT) * 600, rotateX: Math.cos(angle)*15, rotateY: Math.sin(angle)*15, duration: 1.5, ease: "power3.inOut" }, "-=0.3")
      .to(pBot, { x: Math.cos(pAB) * 600, y: Math.sin(pAB) * 600, rotateX: -Math.cos(angle)*15, rotateY: -Math.sin(angle)*15, duration: 1.5, ease: "power3.inOut" }, "<")
      .to("#void-content", { opacity: 1, duration: 1 }, "-=0.5");
}

// --- ACT 2: The Horizontal Hell Reflection Zoom ---
const continueBtn = document.getElementById('continue-text');

continueBtn.addEventListener('click', () => {
    isParallaxActive = false; 
    continueBtn.style.pointerEvents = "none";

    const tl = gsap.timeline();
    tl.to("#void-content", { opacity: 0, duration: 0.5 });

    // 1. Position Horizontal and massive (Z: 4.2 puts it incredibly close to the camera at Z: 5)
    // Note: If the handle is off-center in your 3D file, adjust the 'x' value to slide it left/right.
    tl.to(katanaModel.position, { 
        x: 1.5,   // Shifts it right to focus on the handle
        y: 0,     // Dead center vertically
        z: 4.2,   // 40%+ of the screen!
        duration: 2.5, 
        ease: "power3.inOut" 
    }, "-=0.2")
    .to(katanaModel.rotation, { 
        x: 0, 
        y: Math.PI / 2, // 90 Degrees - perfectly horizontal blade
        z: 0.1,         // Slight tilt
        duration: 2.5, 
        ease: "power3.inOut" 
    }, "<"); 

    // 2. Ignite the Hell Reflection in the dark metal
    katanaMaterials.forEach(mat => {
        tl.to(mat, { envMapIntensity: 2.0, duration: 2.5, ease: "power2.in" }, "<");
    });

    // 3. The Gleam Sweep (A fierce white light that sweeps down the blade)
    tl.to(sweepLight, { intensity: 20, duration: 0.5 }, "-=1.0") // Light flares up
      .to(sweepLight.position, { x: 5, duration: 1.5, ease: "power1.inOut" }, "<") // Light travels across the blade
      .to(sweepLight, { intensity: 0, duration: 0.8 }, "-=0.2"); // Light fades out
});
