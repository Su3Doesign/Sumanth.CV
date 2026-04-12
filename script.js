import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Custom Cursor Logic ---
const cursor = document.getElementById('custom-cursor');
let mouseX = 0;
let mouseY = 0;
let isParallaxActive = true; 

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
});

// --- Three.js Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.08); // Dark, dense void

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Tone mapping makes the lighting and metals look hyper-realistic
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);
camera.position.z = 5;

// --- Cinematic Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Very low base light
scene.add(ambientLight);

// Key light for metal reflections
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Rim light to make the edges of the sword pop
const rimLight = new THREE.DirectionalLight(0xffffff, 2);
rimLight.position.set(-5, 5, -5);
scene.add(rimLight);

// The Core Haki Glow
const hakiLight = new THREE.PointLight(0x8A2BE2, 0, 8); 
scene.add(hakiLight);

// --- The Interactive Void (Forge Embers) ---
// Replaces the ocean with subtle, floating dust/embers
const voidParticlesGeometry = new THREE.BufferGeometry();
const voidParticlesCount = 600;
const voidPosArray = new Float32Array(voidParticlesCount * 3);
for(let i = 0; i < voidParticlesCount * 3; i++) {
    voidPosArray[i] = (Math.random() - 0.5) * 15;
}
voidParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(voidPosArray, 3));
const voidParticlesMaterial = new THREE.PointsMaterial({
    size: 0.02,
    color: 0xD4AF37, // Aged gold sparks
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
});
const voidParticles = new THREE.Points(voidParticlesGeometry, voidParticlesMaterial);
scene.add(voidParticles);


// --- HAKI VFX: Purple Gas System ---
const smokeGeometry = new THREE.BufferGeometry();
const smokeCount = 200;
const smokeArray = new Float32Array(smokeCount * 3);
for(let i = 0; i < smokeCount * 3; i++) {
    smokeArray[i] = (Math.random() - 0.5) * 2; // Tightly clustered
}
smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokeArray, 3));
const smokeMaterial = new THREE.PointsMaterial({
    size: 0.05,
    color: 0x8A2BE2, // Deep purple Haki
    transparent: true,
    opacity: 0, // Hidden until Katana loads and pulses
    blending: THREE.AdditiveBlending
});
const hakiSmoke = new THREE.Points(smokeGeometry, smokeMaterial);
scene.add(hakiSmoke);

// --- HAKI VFX: Lightning Arcs ---
// We create jagged lines that will rapidly update their vertices
const lightningMaterial = new THREE.LineBasicMaterial({ 
    color: 0x9D00FF, 
    transparent: true, 
    opacity: 0 
});
const lightningLines = [];
for (let i = 0; i < 3; i++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(6 * 3); // 6 points per lightning bolt
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, lightningMaterial);
    scene.add(line);
    lightningLines.push(line);
}

// --- Load The Katana ---
const loader = new GLTFLoader();
let katanaModel;

loader.load('models/katana.glb', (gltf) => {
    katanaModel = gltf.scene;
    katanaModel.scale.set(1, 1, 1); 
    katanaModel.position.set(0, 0, 0);
    scene.add(katanaModel);
});

// --- Animation Loop ---
let targetRotationY = 0;
let targetRotationX = 0;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // 1. Animate Void Embers (slowly float up and drift)
    const voidPos = voidParticlesGeometry.attributes.position.array;
    for(let i = 1; i < voidParticlesCount * 3; i += 3) {
        voidPos[i] += 0.005; // Move up
        if (voidPos[i] > 5) voidPos[i] = -5; // Reset at bottom
    }
    voidParticlesGeometry.attributes.position.needsUpdate = true;
    // Embers react slightly to mouse
    voidParticles.rotation.y = mouseX * 0.0002;
    voidParticles.rotation.x = mouseY * 0.0002;

    if (katanaModel && isParallaxActive) {
        // Normal Act 1 Parallax tracking
        const normX = (mouseX / window.innerWidth) * 2 - 1;
        const normY = -(mouseY / window.innerHeight) * 2 + 1;
        targetRotationY = normX * 0.5; 
        targetRotationX = normY * 0.2; 
        
        katanaModel.rotation.y += (targetRotationY - katanaModel.rotation.y) * 0.05;
        katanaModel.rotation.x += (targetRotationX - katanaModel.rotation.x) * 0.05;
        
        // Attach VFX to Katana's position
        hakiLight.position.copy(katanaModel.position);
        hakiSmoke.position.copy(katanaModel.position);
        lightningLines.forEach(line => line.position.copy(katanaModel.position));

        // --- Execute Haki Gas Animation ---
        if (hakiSmoke.material.opacity > 0) {
            const smokePos = smokeGeometry.attributes.position.array;
            for(let i = 0; i < smokeCount * 3; i += 3) {
                smokePos[i + 1] += 0.01; // Gas floats up
                smokePos[i] += Math.sin(time * 2 + i) * 0.01; // Gas swirls
                // Reset particles that float too high
                if (smokePos[i + 1] > 2) {
                    smokePos[i + 1] = -2;
                    smokePos[i] = (Math.random() - 0.5) * 0.5; // Reset near blade
                }
            }
            smokeGeometry.attributes.position.needsUpdate = true;
        }

        // --- Execute Lightning Animation ---
        if (lightningLines[0].material.opacity > 0) {
            // Update lightning geometry rapidly
            if (Math.floor(time * 20) % 2 === 0) {
                lightningLines.forEach(line => {
                    const positions = line.geometry.attributes.position.array;
                    let currentY = -2;
                    for (let i = 0; i < 18; i += 3) {
                        positions[i] = (Math.random() - 0.5) * 1.5; // X spread
                        positions[i + 1] = currentY; // Y steps up the blade
                        positions[i + 2] = (Math.random() - 0.5) * 1.5; // Z spread
                        currentY += 0.8;
                    }
                    line.geometry.attributes.position.needsUpdate = true;
                });
            }
        }

        // Random Haki Surge
        if (Math.random() > 0.98) {
            gsap.to(hakiLight, { intensity: 8, duration: 0.1, yoyo: true, repeat: 1 });
            gsap.to(hakiSmoke.material, { opacity: 0.6, duration: 0.2, yoyo: true, repeat: 1 });
            lightningLines.forEach(line => line.material.opacity = 1);
        } else {
            hakiLight.intensity = Math.max(0, hakiLight.intensity - 0.2);
            hakiSmoke.material.opacity = Math.max(0.1, hakiSmoke.material.opacity - 0.02); // Keep a base level of gas
            lightningLines.forEach(line => line.material.opacity = 0);
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

// --- Act 1: Swipe to Slice Logic ---
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
        ember.style.left = `${x + (Math.random() - 0.5) * 100}px`;
        ember.style.top = `${y + (Math.random() - 0.5) * 100}px`;
        container.appendChild(ember);

        gsap.to(ember, {
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200 - 100, 
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
    const angle = Math.atan2(ey - sy, ex - sx) * (180 / Math.PI);
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;

    gsap.set(sliceFlash, { x: 0, y: midY, rotation: angle, width: "150%", left: "-25%", opacity: 1 });
    createEmbers(midX, midY);

    const tl = gsap.timeline();
    tl.fromTo(sliceFlash, { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: "power4.inOut" })
      .to(sliceFlash, { opacity: 0, duration: 0.3, ease: "power2.out" }, "+=0.1")
      .to("#paper-top", { yPercent: -100, rotateX: 15, duration: 1.5, ease: "power3.inOut" }, "-=0.2")
      .to("#paper-bottom", { yPercent: 100, rotateX: -15, duration: 1.5, ease: "power3.inOut" }, "<")
      .to("#void-content", { opacity: 1, duration: 1 }, "-=0.5");
}

// --- ACT 2: The Mythical Handle Zoom ---
const continueBtn = document.getElementById('continue-text');

continueBtn.addEventListener('click', () => {
    isParallaxActive = false; // Detach from mouse
    continueBtn.style.pointerEvents = "none";

    const tl = gsap.timeline();

    // 1. Fade out the void UI
    tl.to("#void-content", { opacity: 0, duration: 0.5 });

    // 2. Shut off the Haki Gas & Lightning for the clean detail shot
    tl.to(hakiSmoke.material, { opacity: 0, duration: 1 }, "<");
    lightningLines.forEach(line => line.visible = false);

    // 3. The Cinematic Zoom! 
    // We bring the Katana right up to the camera lens and rotate it to expose the handle (Tsuba).
    // Note: If your handle in Blender isn't centered, you will have to adjust these x, y, z numbers.
    tl.to(katanaModel.position, { 
        x: 0.8,   // Pushes it slightly right
        y: -1.2,  // Adjust this depending on where the handle is on your Y axis
        z: 3.8,   // Brings it dangerously close to the camera (Z is 5)
        duration: 2.5, 
        ease: "power3.inOut" 
    }, "-=0.2")
    .to(katanaModel.rotation, { 
        x: 1.2,   // Tilts it back
        y: -1.8,  // Rotates it to show the side profile of the blade/guard
        z: 0.5,
        duration: 2.5, 
        ease: "power3.inOut" 
    }, "<"); // Plays at the same time

    // 4. Boost the Rim Lighting to make the metallic textures gleam
    tl.to(rimLight, { intensity: 6, duration: 2.5 }, "<")
      .to(directionalLight, { intensity: 5, duration: 2.5 }, "<");
});
