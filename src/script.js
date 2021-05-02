import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as dat from 'dat.gui'

// Util functions

// Map a value s in range [a1, a2] to range [b1, b2]
const mapRange = (a1, a2, b1, b2, s) => {
    return b1 + ((s - a1) * (b2- b1)) / (a2 - a1);
}

// Global variables
let windTrails = [];

// Debugbar
const gui = new dat.GUI();

const properties = {
    xSpreadGap: 1,
    xSpread: 5,
    ySpread: 5,
    zSpread: 5,
    windTrailCount: 50,
    windTrailSpeed: 3,
    windTrailSize: 0.05,
    windTrailLength: 1,
    windTrailColour: "#f25d23",
    backgroundColour: "#fff9db"
};

gui.add (properties, 'xSpreadGap').min(0).max(2).step(0.1).name('xSpreadGap').onFinishChange(() => {initiateWinds(); });
gui.add (properties, 'xSpread').min(1).max(10).step(1).name('xSpread').onFinishChange(() => {initiateWinds(); });
gui.add (properties, 'ySpread').min(1).max(10).step(1).name('ySpread').onFinishChange(() => {initiateWinds(); });
gui.add (properties, 'zSpread').min(1).max(10).step(1).name('zSpread').onFinishChange(() => {initiateWinds(); });
gui.add (properties, 'windTrailCount').min(10).max(100).step(1).name('windTrailCount').onFinishChange(() => {initiateWinds(); });
gui.add (properties, 'windTrailSpeed').min(1).max(10).step(0.01).name('windTrailSpeed');
gui.add(properties, 'windTrailSize').min(0.005).max(0.5).step(0.001).name('windTrailSize').onFinishChange(() => {initiateWinds(); });
gui.add(properties, 'windTrailLength').min(0.1).max(5).step(0.01).name('windTrailLength').onFinishChange(() => {initiateWinds(); });
gui.addColor(properties, 'windTrailColour').onFinishChange(() => {initiateWinds(); });
gui.addColor(properties, 'backgroundColour').onFinishChange(() => {
    renderer.setClearColor(new THREE.Color(properties.backgroundColour));
});

// Setup
const sizes = {
    width: 600,
    height: 600
}

const canvas = document.querySelector('canvas.webgl');

const scene = new THREE.Scene();

// const axesHelper = new THREE.AxesHelper( 5 );
// scene.add( axesHelper );

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.z = 3;
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setClearColor(new THREE.Color(properties.backgroundColour));
renderer.render(scene, camera)

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 10;
controls.update();

// GLTF Import
let model, mixer;
const gltfLoader = new GLTFLoader();

gltfLoader.load('models/moth_7.gltf', (gltf) => {
    scene.add(gltf.scene);

    const animations = gltf.animations;
    if ( animations && animations.length) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        for (let i = 0; i < animations.length; i++) {
            mixer.clipAction(animations[i]).play();
        }
    }
    
    model = gltf;
});

// Wind
const generateXRange = () => {
    const rand = (Math.random() - 0.5) * properties.xSpread;
    if (Math.abs(rand) < properties.xSpreadGap) return generateXRange();
    return rand;
}

const createWindTrail = () => {
    const trailLength = Math.random() * properties.windTrailLength;

    const boxGeometry = new THREE.BoxGeometry(properties.windTrailSize, properties.windTrailSize, trailLength);
    const boxMaterial = new THREE.MeshBasicMaterial({
        color: properties.windTrailColour,
        transparent: true,
        opacity: 1
    });

    const windTrail = new THREE.Mesh(boxGeometry, boxMaterial);

    const x = generateXRange();
    const y = (Math.random() - 0.5) * properties.ySpread;
    const z = (Math.random() - 0.5) * properties.zSpread;
    windTrail.position.set(x, y, z);

    return windTrail;
};

const initiateWinds = () => {
    clearWinds();
    for (let i = 0; i < properties.windTrailCount; i++) {
        const trail = createWindTrail();
        scene.add(trail);
        windTrails.push(trail);
    }
}

const clearWinds = () => {
    windTrails.forEach(trail => {
        scene.remove(trail);
    });
    windTrails = [];
}

initiateWinds();
console.log(windTrails);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

// Frame animation

const clock = new THREE.Clock();
let previousTime = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    // Move wind trails
    windTrails.forEach(trail => {
        if (trail.position.z > 5) {
            trail.position.z = -5;
        } else {
            trail.position.z += deltaTime * properties.windTrailSpeed;
        }

        let trailScale;
        if (trail.position.z <= 0) {
            trailScale = mapRange(-5, 0, 0, 1, trail.position.z);
        } else {
            trailScale = mapRange(0, 5, 1, 0, trail.position.z);
        }

        trail.material.opacity = trailScale - 0.1;
    });

    // Animations
    if (mixer) {
        mixer.timeScale = 1;
        mixer.update(deltaTime);
    }

    // Orbit controls
    controls.update();

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

tick();
