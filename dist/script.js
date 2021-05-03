// Util functions

// Map a value s in range [a1, a2] to range [b1, b2]
const mapRange = (a1, a2, b1, b2, s) => {
    return b1 + ((s - a1) * (b2- b1)) / (a2 - a1);
}

// Global variables
let windTrails = [];

const properties = {
    xSpreadGap: 0.3,
    xSpread: 5,
    ySpread: 5,
    zSpread: 10,
    windTrailCount: 42,
    windTrailSpeed: 10,
    windTrailSize: 0.036,
    windTrailLength: 5,
    windTrailColour: "#f9a368",
    windTrailStartLoc: -4,
    windTrailEndLoc: 4,
    backgroundColour: "#e1e2dc"
};

const currentQuaternion = new THREE.Quaternion();

// Setup
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const canvas = document.querySelector('.webgl');

const scene = new THREE.Scene();

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height)
});

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(4, 3, 4);
camera.lookAt(new THREE.Vector3(0,0,0));
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});
renderer.setSize(sizes.width, sizes.height);
renderer.setClearColor(new THREE.Color(properties.backgroundColour));
renderer.render(scene, camera);

const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 10;
controls.update();

// GLTF Import
let model, defaultMixer, tumbleMixer;

const gltfLoader = new THREE.GLTFLoader();

gltfLoader.load('moth_11.gltf', (gltf) => {
    gltf.scene.position.set(0, 0, -3);

    const animations = gltf.animations;
    if ( animations && animations.length) {
        defaultMixer = new THREE.AnimationMixer(gltf.scene);
        tumbleMixer = new THREE.AnimationMixer(gltf.scene);
        
        for (let i = 0; i < animations.length; i++) {
            if (animations[i].name === 'Key.002Action' || animations[i].name === 'CNTRL_Action') {
                tumbleMixer.clipAction(animations[i]).play();
            } else {
                defaultMixer.clipAction(animations[i]).play();
            }
        }
    }
    
    model = gltf;
    model.scene.children[0].position.set(0, 0, 3);
    scene.add(model.scene);
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

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

// Tumbling animation
let tween;
let tumbling = false, correcting = false;
window.addEventListener('dblclick', () => {
    if (!tumbling) {
        tumbling = true;
        correcting = false;
    } else if (tumbling) {
        tumbling = false;
        correcting = true;

        tween = new TWEEN.Tween(currentQuaternion);
        tween.to({ _x: 0, _y: 0, _z: 0, _w: 1 }, 500);
        tween.start();

        tween.onUpdate((obj) => {
            model.scene.children[0].quaternion.set(
                currentQuaternion._x,
                currentQuaternion._y,
                currentQuaternion._z,
                currentQuaternion._w
            );
        });
        
        tween.onComplete(() => {
            correcting = false;
        });        
    }
});

// Frame animation
const clock = new THREE.Clock();
let previousTime = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    // Move wind trails
    windTrails.forEach(trail => {
        if (trail.position.z > properties.windTrailEndLoc) {
            trail.position.z = properties.windTrailStartLoc;
        } else {
            trail.position.z += deltaTime * properties.windTrailSpeed;
        }

        let trailScale;
        if (trail.position.z <= 0) {
            trailScale = mapRange(-5, 0, 0, 1, trail.position.z);
        } else {
            trailScale = mapRange(0, 5, 1, 0, trail.position.z);
        }

        trail.material.opacity = trailScale;
    });

    if (model) {
        currentQuaternion.copy(model.scene.children[0].quaternion);

        // Animations
        if (!tumbling) {
            if (correcting) {
                TWEEN.update();
            } else {
                tumbleMixer.timeScale = 0;
                defaultMixer.timeScale = 1;
                defaultMixer.update(deltaTime);   
            }              
        }

        // Tumble
        else if (tumbling) {
            defaultMixer.timeScale = 0;
            tumbleMixer.timeScale = 1;
            tumbleMixer.update(deltaTime);
        }   
    }

    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
}

tick();
