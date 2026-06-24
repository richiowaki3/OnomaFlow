import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Configuration
const COLS = 60; 
const ROWS = 60; 
const SPACING = 0.5;
const TOTAL_INSTANCES = COLS * ROWS;

// 12D Vector state
let currentVector = [1, 1, 5, 5, 5, 5, 100, 0, 0, 0, 0, "#6366f1"];
let targetVector = [...currentVector];
let lerpVector = [...currentVector];

const state = {
    weight: 1, time: 1, space: 5, flow: 5,
    hardness: 5, moisture: 5, hz: 100, decay: 0,
    reynolds: 0, boyle: 0, temp: 0,
    color: new THREE.Color("#6366f1")
};

// Scene Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015); 

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 20); 

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
controls.target.set(0, 0, -2); 

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

// --- Web Audio Synthesizer Engine ---
class OnomaSynth {
    constructor() {
        this.ctx = null;
        this.synthBus = null;
        this.distortionNode = null;
        this.reverbNode = null;
        this.delayNode = null;
        this.dryGain = null;
        this.wetGain = null;
        this.masterGain = null;
        this.noiseBuffer = null;
    }

    init() {
        if (this.ctx) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.reverbNode = this.ctx.createConvolver();
            this.reverbNode.buffer = this.createReverbBuffer(1.5, 2.0);

            this.delayNode = this.ctx.createDelay(1.5);
            this.delayFeedback = this.ctx.createGain();
            this.delayNode.delayTime.value = 0.22;
            this.delayFeedback.gain.value = 0.25;
            this.delayNode.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);

            this.distortionNode = this.ctx.createWaveShaper();
            this.distortionNode.curve = this.makeDistortionCurve(0);
            this.distortionNode.oversample = '4x';

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.35;

            this.synthBus = this.ctx.createGain();
            this.synthBus.gain.value = 1.0;

            this.dryGain = this.ctx.createGain();
            this.wetGain = this.ctx.createGain();
            this.dryGain.gain.value = 1.0;
            this.wetGain.gain.value = 0.0;

            this.synthBus.connect(this.distortionNode);
            this.distortionNode.connect(this.dryGain);

            this.distortionNode.connect(this.reverbNode);
            this.reverbNode.connect(this.wetGain);

            this.distortionNode.connect(this.delayNode);
            this.delayNode.connect(this.wetGain);

            this.dryGain.connect(this.masterGain);
            this.wetGain.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);

            this.noiseBuffer = this.createNoiseBuffer(2.0);
            console.log("[OnomaSynth] Web Audio Context initialized.");
        } catch (e) {
            console.error("[OnomaSynth] Failed to init AudioContext:", e);
        }
    }

    createReverbBuffer(duration, decay) {
        const sampleRate = this.ctx.sampleRate;
        const len = sampleRate * duration;
        const buffer = this.ctx.createBuffer(2, len, sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < len; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            }
        }
        return buffer;
    }

    createNoiseBuffer(duration) {
        const sampleRate = this.ctx.sampleRate;
        const len = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, len, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 0;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    setMoisture(ms) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const wetRatio = (ms / 9.0) * 0.7;
        const dryRatio = 1.0 - wetRatio * 0.3;
        this.wetGain.gain.setTargetAtTime(wetRatio, now, 0.05);
        this.dryGain.gain.setTargetAtTime(dryRatio, now, 0.05);
    }

    setBoyle(by) {
        if (!this.ctx) return;
        const distAmount = by * 8.0;
        this.distortionNode.curve = this.makeDistortionCurve(distAmount);
    }

    createFormantFilter(sourceNode, vowel, outputNode, now) {
        const FORMANT_MAP = {
            'a': [
                { f: 800,  q: 8,  g: 1.0 },
                { f: 1200, q: 10, g: 0.75 },
                { f: 2500, q: 6,  g: 0.4 }
            ],
            'i': [
                { f: 320,  q: 10, g: 1.0 },
                { f: 2300, q: 15, g: 0.55 },
                { f: 3000, q: 8,  g: 0.35 }
            ],
            'u': [
                { f: 320,  q: 8,  g: 1.0 },
                { f: 1200, q: 8,  g: 0.4 },
                { f: 2500, q: 6,  g: 0.25 }
            ],
            'e': [
                { f: 500,  q: 8,  g: 1.0 },
                { f: 1900, q: 12, g: 0.6 },
                { f: 2500, q: 8,  g: 0.4 }
            ],
            'o': [
                { f: 500,  q: 8,  g: 1.0 },
                { f: 800,  q: 12, g: 0.8 },
                { f: 2500, q: 6,  g: 0.25 }
            ]
        };

        const formants = FORMANT_MAP[vowel] || FORMANT_MAP['u'];
        formants.forEach(fParams => {
            const bp = this.ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(fParams.f, now);
            bp.Q.setValueAtTime(fParams.q, now);
            
            const gNode = this.ctx.createGain();
            gNode.gain.setValueAtTime(fParams.g, now);
            
            sourceNode.connect(bp);
            bp.connect(gNode);
            gNode.connect(outputNode);
        });
    }

    playNote(beatIndex, totalBeats, word) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const w = word.effort.weight;
        const t_att = word.effort.time;
        const fl = word.effort.flow;
        const hd = word.acoustic.hardness;
        const re = word.extended.reynolds_norm;
        const dc = word.acoustic.decay;
        const co = word.phrasing.contour;

        const wordText = word.word || "";
        const isSibilant = /[さしすせそざじずぜぞつちサシスセソザジズゼゾツチ]/.test(wordText);
        const isPlosive = /[ぱぴぷぺぽばびぶべぼパピプペポバビブベボ]/.test(wordText);

        const getVowelForChar = (char) => {
            if (/[あかさたなはまやらわがざだばぱアカサタナハマヤラワガザダバパァヵ]/.test(char)) return 'a';
            if (/[いきしちにひみりぎじぢびぴイキシチニヒミリギジヂビピィ]/.test(char)) return 'i';
            if (/[うくすつぬふむゆるぐずづぶぷウクスツヌフムユルグズヅブプゥッ]/.test(char)) return 'u';
            if (/[えけせてねへめれげぜでべぺエケセテネヘメレゲゼデベペェヶ]/.test(char)) return 'e';
            if (/[おこそとのほもよろごぞどぼぽオコソトノホモヨロゴゾドボポォ]/.test(char)) return 'o';
            return 'u';
        };

        const cleanChars = wordText.replace(/[っッー]/g, '').split('');
        const charIndex = Math.min(beatIndex, cleanChars.length - 1);
        const char = cleanChars[charIndex] || '';
        const vowel = getVowelForChar(char);

        let pitchFreq = word.acoustic.freq_hz || (130.0 * Math.pow(1.5, word.acoustic.freq_norm * 0.33));

        let attackTime = 0.003 + (9 - t_att) * 0.035;
        let decayTime = 0.03 + (9 - dc) * 0.05 + (9 - t_att) * 0.04;
        let sustainLevel = Math.max((9 - dc) * 0.07, 0.001);
        let releaseTime = 0.05 + (9 - dc) * 0.15;

        if (totalBeats > 1) {
            decayTime *= 0.5;
            releaseTime *= 0.5;
            sustainLevel *= 0.4;
        }

        const noteDuration = attackTime + decayTime + releaseTime;
        const isGranular = re >= 4;
        const isModal = hd >= 5 && !isGranular;
        const isNormal = !isModal && !isGranular;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const frictionCoeff = Math.max(re, fl);
        const cutoff = pitchFreq * (1.2 + hd * 0.8 + (frictionCoeff >= 4 ? 0.6 : 0));
        filter.frequency.setValueAtTime(cutoff, now);

        const osc = this.ctx.createOscillator();
        let fmOsc = null;
        let fmGain = null;

        if (isNormal) {
            if (hd > 5) {
                osc.type = 'triangle';
                fmOsc = this.ctx.createOscillator();
                fmGain = this.ctx.createGain();
                fmOsc.frequency.value = pitchFreq * 1.414;
                fmGain.gain.value = pitchFreq * (hd - 4) * 0.7;
                fmOsc.connect(fmGain);
                fmGain.connect(osc.frequency);
                fmOsc.start(now);
                fmOsc.stop(now + noteDuration + 0.1);
            } else {
                osc.type = (hd > 2) ? 'triangle' : 'sine';
            }
            osc.frequency.setValueAtTime(pitchFreq, now);

            if (co < 4) {
                osc.frequency.exponentialRampToValueAtTime(pitchFreq * 1.4, now + noteDuration * 0.7);
            } else if (co > 6) {
                osc.frequency.exponentialRampToValueAtTime(pitchFreq * 0.65, now + noteDuration * 0.7);
            }
            osc.connect(filter);
        } else if (isModal) {
            const modes = [1.0, 1.52, 2.18, 2.94, 3.85];
            const modeGains = [1.0, 0.5, 0.35, 0.2, 0.1];
            const modeDecays = [1.0, 1.4, 1.8, 2.2, 2.6];

            modes.forEach((ratio, idx) => {
                const modeOsc = this.ctx.createOscillator();
                modeOsc.type = 'sine';
                modeOsc.frequency.setValueAtTime(pitchFreq * ratio, now);

                const modeGain = this.ctx.createGain();
                modeGain.gain.setValueAtTime(0, now);
                modeGain.gain.linearRampToValueAtTime(modeGains[idx] * (0.35 + w * 0.05), now + 0.001);
                
                const modeDecayTime = decayTime / modeDecays[idx];
                modeGain.gain.exponentialRampToValueAtTime(0.00001, now + modeDecayTime);

                modeOsc.connect(modeGain);
                modeGain.connect(filter);

                modeOsc.start(now);
                modeOsc.stop(now + modeDecayTime + 0.05);
            });
        }

        let noiseNode = null;
        let noiseGain = null;

        if (re > 1 && !isGranular) {
            noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = this.noiseBuffer;
            noiseNode.loop = true;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(pitchFreq * 1.25, now);
            noiseFilter.Q.setValueAtTime(1.0 + (9 - re) * 0.25, now);

            noiseGain = this.ctx.createGain();
            const noiseVolume = (re / 9.0) * 0.38;
            noiseGain.gain.setValueAtTime(noiseVolume, now);

            noiseNode.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseNode.start(now);
        }

        const voiceGain = this.ctx.createGain();
        voiceGain.gain.setValueAtTime(0, now);
        
        if (isNormal || isModal) {
            voiceGain.gain.linearRampToValueAtTime(0.35 + w * 0.05, now + attackTime);
            voiceGain.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.0001), now + attackTime + decayTime);
            voiceGain.gain.setValueAtTime(sustainLevel, now + attackTime + decayTime);
            voiceGain.gain.exponentialRampToValueAtTime(0.00001, now + noteDuration);
        }

        const formantInput = this.ctx.createGain();
        formantInput.gain.setValueAtTime(1.0, now);

        if (isNormal || isModal) {
            filter.connect(voiceGain);
            voiceGain.connect(formantInput);
            if (noiseGain) noiseGain.connect(formantInput);
        }

        if (isGranular) {
            const numGrains = 10 + Math.floor(re * 1.5);
            const grainSpacing = 0.015;

            for (let g = 0; g < numGrains; g++) {
                const grainTime = now + g * grainSpacing + (Math.random() - 0.5) * 0.01;
                const grainDuration = 0.02 + Math.random() * 0.04;
                const grainPitch = pitchFreq * (1.0 + (Math.random() - 0.5) * 0.18 * (re / 9.0));

                const grainOsc = this.ctx.createOscillator();
                grainOsc.type = (frictionCoeff >= 4) ? 'sawtooth' : 'triangle';
                grainOsc.frequency.setValueAtTime(grainPitch, grainTime);

                const grainGain = this.ctx.createGain();
                grainGain.gain.setValueAtTime(0, grainTime);
                grainGain.gain.linearRampToValueAtTime(0.06 + w * 0.03, grainTime + grainDuration * 0.3);
                grainGain.gain.exponentialRampToValueAtTime(0.00001, grainTime + grainDuration);

                const grainFilter = this.ctx.createBiquadFilter();
                grainFilter.type = 'lowpass';
                grainFilter.frequency.setValueAtTime(grainPitch * (1.2 + hd * 0.5), grainTime);

                grainOsc.connect(grainFilter);
                grainFilter.connect(grainGain);
                grainGain.connect(formantInput);

                grainOsc.start(grainTime);
                grainOsc.stop(grainTime + grainDuration + 0.05);
            }
        }

        const tremoloGain = this.ctx.createGain();
        tremoloGain.gain.setValueAtTime(1.0, now);
        
        let lfo = null;
        if (re >= 4) {
            lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.setValueAtTime(15.0 + re * 6.0, now);
            lfoGain.gain.setValueAtTime((re - 4) * 0.12, now);
            lfo.connect(lfoGain);
            lfoGain.connect(tremoloGain.gain);
            lfo.start(now);
            lfo.stop(now + noteDuration + 0.1);
        }

        this.createFormantFilter(formantInput, vowel, tremoloGain, now);

        let sibNoiseNode = null;
        if (isSibilant) {
            sibNoiseNode = this.ctx.createBufferSource();
            sibNoiseNode.buffer = this.noiseBuffer;
            sibNoiseNode.loop = true;

            const sibFilter = this.ctx.createBiquadFilter();
            sibFilter.type = 'highpass';
            sibFilter.frequency.setValueAtTime(4500.0, now);

            const sibGain = this.ctx.createGain();
            const sibVolume = 0.28 + (re / 9.0) * 0.15;
            sibGain.gain.setValueAtTime(0.0, now);
            sibGain.gain.linearRampToValueAtTime(sibVolume, now + 0.015);
            sibGain.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime * 1.5);

            sibNoiseNode.connect(sibFilter);
            sibFilter.connect(sibGain);
            sibGain.connect(tremoloGain);

            sibNoiseNode.start(now);
            sibNoiseNode.stop(now + attackTime + decayTime * 1.5 + 0.1);
        }

        let popOsc = null;
        if (isPlosive) {
            popOsc = this.ctx.createOscillator();
            const popGain = this.ctx.createGain();
            popOsc.frequency.setValueAtTime(80.0, now);
            popOsc.frequency.exponentialRampToValueAtTime(10.0, now + 0.025);

            popGain.gain.setValueAtTime(0.0, now);
            popGain.gain.linearRampToValueAtTime(0.75, now + 0.002);
            popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

            popOsc.connect(popGain);
            popGain.connect(tremoloGain);

            popOsc.start(now);
            popOsc.stop(now + 0.03);
        }

        tremoloGain.connect(this.synthBus);

        if (isNormal) {
            osc.start(now);
            osc.stop(now + noteDuration + 0.1);
        }

        if (noiseNode) {
            noiseNode.stop(now + noteDuration + 0.1);
        }
    }
}

const onomaSynth = new OnomaSynth();

// --- Levenshtein Distance & Parameter Estimation ---
function levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    return track[str2.length][str1.length];
}

function estimateWordParameters(query) {
    let est = {
        effort: { weight: 5.0, time: 5.0, space: 5.0, flow: 5.0 },
        acoustic: { hardness: 5.0, moisture: 5.0, freq_norm: 5.0, decay: 5.0, freq_hz: 0 },
        extended: { reynolds_norm: 5.0, boyle: 5.0, temp_ord: 5.0, color_hex: "#6366f1" },
        phrasing: { accent: 5.0, contour: 5.0, meter: 4, regularity: 5 }
    };
    
    let weightOffset = 0;
    let timeOffset = 0;
    let spaceOffset = 0;
    let flowOffset = 0;
    let hardnessOffset = 0;
    let moistureOffset = 0;
    let freqOffset = 0;
    let decayOffset = 0;
    let reynoldsOffset = 0;
    let boyleOffset = 0;
    let tempOffset = 0;
    
    const len = query.length;
    if (len === 0) return est;
    
    for (let i = 0; i < len; i++) {
        const char = query[i];
        
        if (/[がぎぐげござじずぜぞだぢづでどばびぶべぼガギグゲゴザジズゼゾダヂヅデドバビブベボ]/.test(char)) {
            weightOffset += 1.8;
            hardnessOffset += 1.2;
            reynoldsOffset += 1.5;
            freqOffset -= 1.5;
            boyleOffset += 1.5;
            tempOffset += 0.5;
        } else if (/[ぱぴぷぺぽパピプペポ]/.test(char)) {
            hardnessOffset += 1.5;
            timeOffset += 1.5;
            weightOffset += 0.2;
            boyleOffset += 0.5;
        } else if (/[さしすせそざじずぜぞつちサシスセソザジズゼゾツチ]/.test(char)) {
            reynoldsOffset += 2.0;
            flowOffset += 0.5;
        } else if (/[まみむめもなにぬねのらりるれろわマミムメモナニヌネノラリルレロワ]/.test(char)) {
            flowOffset += 1.5;
            hardnessOffset -= 1.0;
            moistureOffset += 1.0;
        }
        
        if (/[あかさたなはまやらわがざだばぱアカサタナハマヤラワガザダバパァヵ]/.test(char)) {
            spaceOffset += 1.0;
            freqOffset -= 0.5;
            tempOffset += 0.8;
        } else if (/[いきしちにひみりぎじぢびぴイキシチニヒミリギジヂビピィ]/.test(char)) {
            spaceOffset -= 1.5;
            freqOffset += 2.0;
            tempOffset -= 1.0;
            hardnessOffset += 0.5;
        } else if (/[うくすつぬふむゆるぐずづぶぷウクスツヌフムユルグズヅブプゥ]/.test(char)) {
            spaceOffset -= 0.5;
            freqOffset -= 0.2;
            tempOffset -= 0.2;
        } else if (/[おこそとのほもよろごぞどぼぽオコソトノホモヨロゴゾドボポォ]/.test(char)) {
            spaceOffset += 1.5;
            freqOffset -= 1.0;
            weightOffset += 0.8;
            tempOffset += 0.4;
        }
        
        if (char === 'っ' || char === 'ッ') {
            timeOffset += 3.0;
            decayOffset += 3.0;
            hardnessOffset += 1.0;
        } else if (char === 'ん' || char === 'ン') {
            moistureOffset += 2.0;
            flowOffset += 1.0;
            decayOffset -= 1.0;
        } else if (char === 'ー') {
            timeOffset -= 2.5;
            decayOffset -= 3.0;
            flowOffset += 1.5;
        }
    }
    
    const scale = Math.sqrt(len);
    est.effort.weight = Math.min(Math.max(5.0 + weightOffset / scale, 1.0), 9.0);
    est.effort.time = Math.min(Math.max(5.0 + timeOffset / scale, 1.0), 9.0);
    est.effort.space = Math.min(Math.max(5.0 + spaceOffset / scale, 1.0), 9.0);
    est.effort.flow = Math.min(Math.max(5.0 + flowOffset / scale, 1.0), 9.0);
    
    est.acoustic.hardness = Math.min(Math.max(5.0 + hardnessOffset / scale, 1.0), 9.0);
    est.acoustic.moisture = Math.min(Math.max(5.0 + moistureOffset / scale, 1.0), 9.0);
    est.acoustic.freq_norm = Math.min(Math.max(5.0 + freqOffset / scale, 1.0), 9.0);
    est.acoustic.decay = Math.min(Math.max(5.0 + decayOffset / scale, 1.0), 9.0);
    
    est.extended.reynolds_norm = Math.min(Math.max(5.0 + reynoldsOffset / scale, 1.0), 9.0);
    est.extended.boyle = Math.min(Math.max(5.0 + boyleOffset / scale, 1.0), 9.0);
    est.extended.temp_ord = Math.min(Math.max(5.0 + tempOffset / scale, 1.0), 9.0);
    
    est.acoustic.freq_hz = 130.0 * Math.pow(1.5, est.acoustic.freq_norm * 0.33);
    
    const halfLen = Math.floor(len / 2);
    const firstHalf = query.substring(0, halfLen);
    const secondHalf = query.substring(halfLen);
    if (firstHalf === secondHalf && len >= 4) {
        est.phrasing.meter = 6;
        est.phrasing.regularity = 7;
    } else if (/[っッ]/.test(query)) {
        est.phrasing.meter = 2;
        est.phrasing.regularity = 8;
    } else {
        est.phrasing.meter = 4;
        est.phrasing.regularity = 5;
    }
    
    est.phrasing.accent = est.effort.weight;
    est.phrasing.contour = Math.min(Math.max(5.0 - freqOffset / scale, 1.0), 9.0);
    
    let candidates = ONOMA_DICT.map(item => {
        return {
            item: item,
            dist: levenshteinDistance(query, item.word)
        };
    });
    
    candidates.sort((a, b) => a.dist - b.dist);
    const neighbors = candidates.slice(0, 3);
    
    if (neighbors.length > 0) {
        let avg = {
            weight: 0, time: 0, space: 0, flow: 0,
            hardness: 0, moisture: 0, freq_norm: 0, decay: 0,
            reynolds: 0, boyle: 0, temp: 0
        };
        
        let totalWeight = 0;
        neighbors.forEach(n => {
            const w_n = 1.0 / (n.dist + 1);
            totalWeight += w_n;
            avg.weight += n.item.effort.weight * w_n;
            avg.time += n.item.effort.time * w_n;
            avg.space += n.item.effort.space * w_n;
            avg.flow += n.item.effort.flow * w_n;
            
            avg.hardness += n.item.acoustic.hardness * w_n;
            avg.moisture += n.item.acoustic.moisture * w_n;
            avg.freq_norm += n.item.acoustic.freq_norm * w_n;
            avg.decay += n.item.acoustic.decay * w_n;
            
            avg.reynolds += n.item.extended.reynolds_norm * w_n;
            avg.boyle += (n.item.extended.boyle || 0) * w_n;
            avg.temp += n.item.extended.temp_ord * w_n;
        });
        
        avg.weight /= totalWeight;
        avg.time /= totalWeight;
        avg.space /= totalWeight;
        avg.flow /= totalWeight;
        avg.hardness /= totalWeight;
        avg.moisture /= totalWeight;
        avg.freq_norm /= totalWeight;
        avg.decay /= totalWeight;
        avg.reynolds /= totalWeight;
        avg.boyle /= totalWeight;
        avg.temp /= totalWeight;
        
        const closestDist = neighbors[0].dist;
        let neighborBlendRatio = 0.65;
        if (closestDist > 3) {
            neighborBlendRatio = 0.25;
        } else if (closestDist === 0) {
            neighborBlendRatio = 1.0;
        }
        
        const ruleRatio = 1.0 - neighborBlendRatio;
        
        est.effort.weight = est.effort.weight * ruleRatio + avg.weight * neighborBlendRatio;
        est.effort.time = est.effort.time * ruleRatio + avg.time * neighborBlendRatio;
        est.effort.space = est.effort.space * ruleRatio + avg.space * neighborBlendRatio;
        est.effort.flow = est.effort.flow * ruleRatio + avg.flow * neighborBlendRatio;
        
        est.acoustic.hardness = est.acoustic.hardness * ruleRatio + avg.hardness * neighborBlendRatio;
        est.acoustic.moisture = est.acoustic.moisture * ruleRatio + avg.moisture * neighborBlendRatio;
        est.acoustic.freq_norm = est.acoustic.freq_norm * ruleRatio + avg.freq_norm * neighborBlendRatio;
        est.acoustic.decay = est.acoustic.decay * ruleRatio + avg.decay * neighborBlendRatio;
        
        est.extended.reynolds_norm = est.extended.reynolds_norm * ruleRatio + avg.reynolds * neighborBlendRatio;
        est.extended.boyle = est.extended.boyle * ruleRatio + avg.boyle * neighborBlendRatio;
        est.extended.temp_ord = est.extended.temp_ord * ruleRatio + avg.temp * neighborBlendRatio;
        
        est.acoustic.freq_hz = 130.0 * Math.pow(1.5, est.acoustic.freq_norm * 0.33);
    }
    
    est.effort.weight = Math.round(est.effort.weight * 10) / 10;
    est.effort.time = Math.round(est.effort.time * 10) / 10;
    est.effort.space = Math.round(est.effort.space * 10) / 10;
    est.effort.flow = Math.round(est.effort.flow * 10) / 10;
    est.acoustic.hardness = Math.round(est.acoustic.hardness * 10) / 10;
    est.acoustic.moisture = Math.round(est.acoustic.moisture * 10) / 10;
    est.acoustic.freq_norm = Math.round(est.acoustic.freq_norm * 10) / 10;
    est.acoustic.decay = Math.round(est.acoustic.decay * 10) / 10;
    est.extended.reynolds_norm = Math.round(est.extended.reynolds_norm * 10) / 10;
    est.extended.boyle = Math.round(est.extended.boyle * 10) / 10;
    est.extended.temp_ord = Math.round(est.extended.temp_ord * 10) / 10;
    
    const r = Math.min(Math.max(Math.floor((est.extended.temp_ord / 9) * 200 + (est.acoustic.hardness / 9) * 55), 0), 255);
    const g = Math.min(Math.max(Math.floor(80 + (est.effort.flow / 9) * 80 - (est.extended.temp_ord / 9) * 50), 0), 255);
    const b = Math.min(Math.max(Math.floor(255 - (est.extended.temp_ord / 9) * 150 + (est.acoustic.moisture / 9) * 50), 0), 255);
    
    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };
    est.extended.color_hex = "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    est.word = query;
    return est;
}

const toHiragana = (str) => {
    return str.replace(/[\u30a1-\u30f6]/g, (match) => {
        const chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
};

// --- Sync state variables for audio triggers ---
let activeWord = null;
let animationTime = 0;
let lastBeatIndex = -1;

const triggerExecute = (query) => {
    onomaSynth.init();
    if(!query) return;
    const word = toHiragana(query);
    statusText.textContent = `ANALYZING: ${word}...`;
    
    const found = ONOMA_DICT.find(item => item.word === word);
    let selectedWordObj = found ? found : estimateWordParameters(word);

    // Reset audio trigger timeline
    animationTime = 0;
    lastBeatIndex = -1;
    activeWord = selectedWordObj;

    // Build 12D Vector mapping for OnomaFlow matrix deformation
    const vector = [
        selectedWordObj.effort.weight,
        selectedWordObj.effort.time,
        selectedWordObj.effort.space,
        selectedWordObj.effort.flow,
        selectedWordObj.acoustic.hardness,
        selectedWordObj.acoustic.moisture,
        selectedWordObj.acoustic.freq_hz,
        selectedWordObj.acoustic.decay,
        selectedWordObj.extended.reynolds_norm * 1111.0, // Scale Reynolds to 0-10000
        selectedWordObj.extended.boyle * 0.67, // Scale Boyle to 0-6
        selectedWordObj.extended.temp_ord,
        selectedWordObj.extended.color_hex
    ];

    targetVector = vector;
    statusText.textContent = `DATA RECEIVED: ${word}`;
    
    // Update vector display in UI
    for(let i=0; i<11; i++) {
        const el = document.getElementById(uiIds[i]);
        if(el) el.textContent = Math.round(targetVector[i]);
    }
    if(swatch) swatch.style.backgroundColor = targetVector[11];
};

form.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerExecute(wordInput.value.trim());
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

    // --- Audio Trigger synchronization ---
    if (activeWord) {
        const mt = activeWord.phrasing.meter;
        const baseFreq = 0.4 + mt * 0.25;
        const T = 1.0 / baseFreq;
        const N = 1 + Math.floor(mt / 3.0);
        const T_beat = T / N;
        const rg = activeWord.phrasing.regularity;

        const jitter = (Math.random() - 0.5) * (rg / 9.0) * 0.05;
        animationTime += delta + jitter;

        const currentBeatIndex = Math.floor(animationTime / T_beat);
        if (lastBeatIndex === -1) {
            onomaSynth.playNote(0, N, activeWord);
            lastBeatIndex = 0;
        } else if (currentBeatIndex > lastBeatIndex) {
            for (let b = lastBeatIndex + 1; b <= currentBeatIndex; b++) {
                onomaSynth.playNote(b % N, N, activeWord);
            }
            lastBeatIndex = currentBeatIndex;
        }
    }

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
