import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Initialize GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const cursor = document.getElementById('custom-cursor');
let mouseX = 0; let mouseY = 0;
let isParallaxActive = true; 

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursor.style.left = `${mouseX}px`; cursor.style.top = `${mouseY}px`;
});

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.08);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Removed toneMapping that was washing out your baked textures
container.appendChild(renderer.domElement);
camera.position.z = 5;

// --- Lighting (Fixed to show your baked model) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Brightened up
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const hakiLight = new THREE.PointLight(0x8A2BE2, 0, 8); // Deep Purple
scene.add(hakiLight);

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

// --- Load The Katana (Fixed Materials) ---
const loader = new GLTFLoader();
let katanaModel;

loader.load('models/katana.glb', (gltf) => {
    katanaModel = gltf.scene;
    // Removed the material override so your Blender textures show up perfectly
    katanaModel.scale.set(1, 1, 1); 
    katanaModel.position.set(0, 0, 0);
    scene.add(katanaModel);
});

// --- Animation Loop ---
let targetRotationY = 0; let targetRotationX = 0;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // Embers drift
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

// --- ACT 2: Cinematic Framing & SCROLL-TRIGGERED SHEATHING ---
const continueBtn = document.getElementById('continue-text');

continueBtn.addEventListener('click', () => {
    isParallaxActive = false; 
    continueBtn.style.pointerEvents = "none";

    const tl = gsap.timeline();
    tl.to("#void-content", { opacity: 0, duration: 0.5 });

    // 1. Move to a safe, visible, cinematic horizontal pose (Z is pulled back to 2.5)
    tl.to(katanaModel.position, { 
        x: 0, y: 0, z: 2.5, duration: 1.5, ease: "power3.inOut" 
    }, "-=0.2")
    .to(katanaModel.rotation, { 
        x: 0, y: Math.PI / 2, z: 0.1, duration: 1.5, ease: "power3.inOut" 
    }, "<"); 

    // 2. Unlock scrolling and tie the Katana movement to the mouse wheel!
    tl.call(() => {
        document.body.style.overflow = "auto"; // Allows scrolling
        document.getElementById('scroll-track').style.display = "block"; // Activates the scroll bar

        // As you scroll down, the katana slides off to the left (simulating sheathing)
        gsap.to(katanaModel.position, {
            x: -8, // Slides way off screen to the left
            ease: "none",
            scrollTrigger: {
                trigger: "#scroll-track",
                start: "top top",
                end: "80% bottom", // Finish sliding right before you hit the bottom of the page
                scrub: 1 // Makes it buttery smooth and tied exactly to your wheel
            }
        });

        // 3. The Anime Flash Impact at the bottom of the scroll
        ScrollTrigger.create({
            trigger: "#scroll-track",
            start: "90% bottom", // Triggers at the very end of the scroll
            onEnter: () => {
                gsap.to("#flash-bang", { opacity: 1, duration: 0.1 });
                // We will build Act 3 (The Gallery) here next!
            },
            onLeaveBack: () => {
                // If you scroll back up, remove the flash
                gsap.to("#flash-bang", { opacity: 0, duration: 0.1 });
            }
        });
    });
});
