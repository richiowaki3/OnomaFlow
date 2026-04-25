import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Configuration
const COLS = 60; 
const ROWS = 60; 
const SPACING = 0.5;
const TOTAL_INSTANCES = COLS * ROWS;

// 12D Vector state
let currentVector = [1, 1, 5, 5, 5, 5, 100, 0, 0, 0, 0, "#00d2ff"];
let targetVector = [...currentVector];
let lerpVector = [...currentVector];

const state = {
    weight: 1, time: 1, space: 5, flow: 5,
    hardness: 5, moisture: 5, hz: 100, decay: 0,
    reynolds: 0, boyle: 0, temp: 0,
    color: new THREE.Color("#0b4")
};

// Scene Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015); 

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 20); // 50% closer to the center

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x050508); 
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 150;
controls.target.set(0, 0, -2); // Adjusted target slightly

// Auto-Rotation Setup (Extremely slow, 3x slower than previous)
controls.autoRotate = true;
controls.autoRotateSpeed = 0.67; 

controls.update();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 2.5, 300);
pointLight.position.set(0, 50, 0);
scene.add(pointLight);

// Instanced Mesh
const geometry = new THREE.BoxGeometry(0.35, 0.35, 0.35);
const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.2
});
const mesh = new THREE.InstancedMesh(geometry, material, TOTAL_INSTANCES);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();
const hotColor = new THREE.Color("#ff0000");

// UI Elements
const uiIds = ['v-x1','v-x2','v-x3','v-x4','v-x5','v-x6','v-x7','v-x8','v-x9','v-x10','v-x11'];
const swatch = document.getElementById('v-x12');
const wordInput = document.getElementById('word-input');
const form = document.getElementById('word-form');
const statusText = document.getElementById('status-text');

const toHiragana = (str) => {
    return str.replace(/[\u30a1-\u30f6]/g, (match) => {
        const chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let word = wordInput.value.trim();
    if(!word) return;
    word = toHiragana(word);
    statusText.textContent = `ANALYZING: ${word}...`;
    try {
        const res = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word })
        });
        const data = await res.json();
        if (data.vector) {
            targetVector = data.vector;
            statusText.textContent = `DATA RECEIVED: ${word}`;
            for(let i=0; i<11; i++) {
                const el = document.getElementById(uiIds[i]);
                if(el) el.textContent = Math.round(targetVector[i]);
            }
            if(swatch) swatch.style.backgroundColor = targetVector[11];
        }
    } catch(err) {
        statusText.textContent = "CONNECTION ERROR";
    }
});

const clock = new THREE.Clock();
let globalPhase = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    const lerpSpeed = 0.8;
    for(let i=0; i<11; i++) {
        lerpVector[i] += (targetVector[i] - lerpVector[i]) * lerpSpeed * delta;
    }
    state.color.lerp(new THREE.Color(targetVector[11]), lerpSpeed * delta);
    
    state.weight = lerpVector[0];
    state.time = lerpVector[1];
    state.space = lerpVector[2];
    state.flow = lerpVector[3];
    state.hardness = lerpVector[4];
    state.moisture = lerpVector[5];
    state.hz = lerpVector[6];
    state.decay = lerpVector[7];
    state.reynolds = lerpVector[8];
    state.boyle = lerpVector[9];
    state.temp = lerpVector[10];

    // Reverted Time speed mapping for more dynamic motion
    const speed = 0.3 + (state.time * 0.15); 
    globalPhase += speed * delta;

    let idx = 0;
    const offsetX = -((COLS - 1) * SPACING) / 2;
    const offsetZ = -((ROWS - 1) * SPACING) / 2;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * SPACING + offsetX;
            const z = r * SPACING + offsetZ;
            
            const freqU = (state.hz / 4000) + 0.1;
            const freqV = (state.space / 20) + 0.1;
            
            let y = Math.sin(x * freqU + globalPhase) * Math.cos(z * freqV + globalPhase * 0.8);
            
            if (state.reynolds > 500) {
                const turb = Math.sin(x * 20 + globalPhase * 2) * Math.cos(z * 20 + globalPhase * 3);
                y += turb * (state.reynolds / 15000);
            }
            
            y = Math.abs(y) * (state.weight * 0.35 + 0.05);

            if (state.hardness < 3) y = Math.round(y * 4) / 4;

            dummy.position.set(x, y - (state.weight * 0.1), z);
            dummy.scale.set(1, 1 + y * 0.5, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx, dummy.matrix);
            
            tempColor.copy(state.color);
            if (y > 0.3) tempColor.lerp(hotColor, Math.min(1, (y - 0.3) * 2.0));
            
            mesh.setColorAt(idx, tempColor);
            idx++;
        }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
