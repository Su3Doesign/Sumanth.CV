import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Custom Cursor Logic ---
const cursor = document.getElementById('custom-cursor');
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
});

// --- Three.js Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0A1128, 0.05); // Fog matches Deep Navy

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);
camera.position.z = 5;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const hakiLight = new THREE.PointLight(0x8A2BE2, 0, 10); 
scene.add(hakiLight);

// --- The Grand Line Ocean (Live Waves) ---
const oceanGeometry = new THREE.PlaneGeometry(30, 30, 64, 64);
const oceanMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x1282A2, // Maritime Teal Wireframe
    wireframe: true, 
    transparent: true, 
    opacity: 0 // Hidden until cut
});
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -3;
ocean.position.z = -5;
scene.add(ocean);

// --- Load The Katana ---
const loader = new GLTFLoader();
let katanaModel;

loader.load('models/katana.glb', (gltf) => {
    katanaModel = gltf.scene;
    katanaModel.scale.set(1, 1, 1); 
    katanaModel.position.set(0, 0, 0);
    scene.add(katanaModel);
});

// --- Animation & Parallax Loop ---
let targetRotationY = 0;
let targetRotationX = 0;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Animate Ocean Waves
    const positions = oceanGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        positions[i + 2] = Math.sin(x * 0.5 + time) * 0.3 + Math.cos(y * 0.5 + time) * 0.3;
    }
    oceanGeometry.attributes.position.needsUpdate = true;

    // Parallax logic
    if (katanaModel) {
        const normX = (mouseX / window.innerWidth) * 2 - 1;
        const normY = -(mouseY / window.innerHeight) * 2 + 1;
        targetRotationY = normX * 0.5; 
        targetRotationX = normY * 0.2; 
        
        katanaModel.rotation.y += (targetRotationY - katanaModel.rotation.y) * 0.05;
        katanaModel.rotation.x += (targetRotationX - katanaModel.rotation.x) * 0.05;
        hakiLight.position.copy(katanaModel.position);
    }

    if (Math.random() > 0.98) {
        gsap.to(hakiLight, { intensity: 5, duration: 0.1, yoyo: true, repeat: 1 });
    } else {
        hakiLight.intensity = Math.max(0, hakiLight.intensity - 0.1);
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Dynamic Directional Swipe Logic ---
let isDragging = false;
let startX = 0, startY = 0;
const paperContainer = document.getElementById('paper-container');
const sliceFlash = document.getElementById('slice-flash');

paperContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    cursor.style.transform = "translate(-50%, -50%) scale(0.5)"; 
});

paperContainer.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    cursor.style.transform = "translate(-50%, -50%) scale(1)";

    const endX = e.clientX;
    const endY = e.clientY;
    const distance = Math.hypot(endX - startX, endY - startY);

    if (distance > 150) {
        triggerSlice(startX, startY, endX, endY);
    }
});

function createEmbers(x, y) {
    const container = document.getElementById('embers-container');
    for(let i = 0; i < 20; i++) {
        const ember = document.createElement('div');
        ember.className = 'ember';
        // Randomize spawn position along the cut
        ember.style.left = `${x + (Math.random() - 0.5) * 100}px`;
        ember.style.top = `${y + (Math.random() - 0.5) * 100}px`;
        container.appendChild(ember);

        gsap.to(ember, {
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200 - 100, // Float up
            opacity: 1,
            duration: Math.random() * 0.5 + 0.5,
            onComplete: () => {
                gsap.to(ember, { opacity: 0, duration: 0.5, onComplete: () => ember.remove() });
            }
        });
    }
}

function triggerSlice(sx, sy, ex, ey) {
    paperContainer.style.pointerEvents = "none";

    // Calculate angle of the mouse drag
    const angle = Math.atan2(ey - sy, ex - sx) * (180 / Math.PI);
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;

    // Position and rotate the flash line
    gsap.set(sliceFlash, {
        x: 0, // Centered horizontally by CSS, so we just use the calculated width
        y: midY,
        rotation: angle,
        width: "150%",
        left: "-25%",
        opacity: 1
    });

    createEmbers(midX, midY);

    const tl = gsap.timeline();

    // 1. The Fire Flash Line
    tl.fromTo(sliceFlash, { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: "power4.inOut" })
      .to(sliceFlash, { opacity: 0, duration: 0.3, ease: "power2.out" }, "+=0.1");

    // 2. The Paper Split & Ocean Reveal
    tl.to("#paper-top", { yPercent: -100, rotateX: 15, duration: 1.5, ease: "power3.inOut" }, "-=0.2");
    tl.to("#paper-bottom", { yPercent: 100, rotateX: -15, duration: 1.5, ease: "power3.inOut" }, "<"); 
    
    // Fade in the animated ocean
    tl.to(oceanMaterial, { opacity: 0.3, duration: 2 }, "-=1.0");

    // 3. Reveal the Void and CONTINUE text
    tl.to("#void-content", { opacity: 1, duration: 1 }, "-=0.5");
}
