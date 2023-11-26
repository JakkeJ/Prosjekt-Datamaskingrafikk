import './style.css';
import * as THREE from "three";
import * as TWEEN from '@tweenjs/tween.js' // HUSK: npm install @tweenjs/tween.js
import {createTriangleShapeAddToCompound} from "./triangleMeshHelpers.js";
import {degToRad} from "three/src/math/MathUtils.js";
import {
    createMovable,
    moveRigidBodyAnimation
} from "./movable.js";
import {
    createThreeScene,
    onWindowResize,
    handleKeyUp,
    handleKeyDown,
    keyPresses,
    onDocumentTouchStart,
    onDocumentMouseDown,
    renderCamera,
    addLights,
    water,
    arrow,
    addLineBetweenObjects
} from "./threeHelpers.js";
import {
    createAmmoWorld,
    updatePhysics,
    createAmmoRigidBody
} from "./ammoHelpers.js"
import {
    createAmmoMesh, createHeightFieldShape, getHeigtdataFromImage, updateLines, updateHingeMarkers
} from "./threeAmmoHelpers.js";
import {
    ground, terrain,
    steps,
    ball,
    rails,
    cannon,
    cannonTarget,
    domino,
    funnel,
    golfclub,
    newtonCradle,
    plinko,
    spiral,
    cube,
    tableMesh
} from "./threeAmmoShapes.js";


export const ri = {
    currentlyPressedKeys: [],
    springs: {
        cannonSpring: undefined,
    },
    camera: undefined,
    controls: undefined,
    renderer: undefined,
    scene: undefined,
    raycaster: undefined,
    mouse: undefined,
    lilGui: undefined,
    balls: [],
    textures: {},
    uniforms: {}
}

export const phy = {
    ammoPhysicsWorld: undefined,
    rigidBodies: [],
    checkCollisions: true,
}


export function main() {
    createThreeScene();
    createAmmoWorld();

    // Clock for animation
    ri.clock = new THREE.Clock();

    // For clicking on target
    ri.raycaster = new THREE.Raycaster();
    ri.mouse = new THREE.Vector2();

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keyup', handleKeyUp, false);
    document.addEventListener('keydown', handleKeyDown, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('touchstart', onDocumentTouchStart, false);

    addToScene();
}


function addToScene() {
    const manager = new THREE.LoadingManager();
    const cubeLoader = new THREE.CubeTextureLoader();
    // Skybox textures: https://opengameart.org/content/cloudy-skyboxes
    const paths = [
        'static/assets/skybox/bluecloud',
        'static/assets/skybox/browncloud',
        'static/assets/skybox/graycloud',
        'static/assets/skybox/yellowcloud'
    ]
    const path = paths[3]

    cubeLoader.load(
        [
            path + '_ft.jpg',
            path + '_bk.jpg',
            path + '_up.jpg',
            path + '_dn.jpg',
            path + '_rt.jpg',
            path + '_lf.jpg',
        ],
        (environmentMapTexture) => {
            ri.scene.background = environmentMapTexture;
        }
    )

    const loader = new THREE.TextureLoader(manager);

    ri.textures.johnny = loader.load('static/assets/textures/johnny.png');
    // grass texture: https://opengameart.org/content/seamless-grass-texture
    ri.textures.grass = loader.load('static/assets/textures/grass.png');
    ri.textures.darkGrey = loader.load('static/assets/textures/darkGreyTexture.png')
    ri.textures.water = loader.load('static/assets/textures/water.jpg')
    ri.textures.cloud = loader.load('static/assets/textures/cloud.png')
    ri.textures.darkBlue = loader.load('static/assets/textures/darkblueTexture.png')
    ri.textures.grey = loader.load('static/assets/textures/greyTexture.png')
    ri.textures.target = loader.load('static/assets/textures/target.png')

    ri.textures.heightmap1 = loader.load('static/assets/textures/heightmap1.png')
    ri.textures.heightmap2 = loader.load('static/assets/textures/heightmap2.png')
    ri.textures.heightmap3 = loader.load('static/assets/textures/heightmap3.png')

    manager.onLoad = () => {
        addLights()

        // Three-Ammo objects:
        threeAmmoObjects();
        createMovable();

        // Start animate loop
        animate(0)
    }
}


function animate(currentTime) {
    window.requestAnimationFrame((currentTime) => {animate(currentTime);});

    const delta = ri.clock.getDelta();
    const elapsed = ri.clock.getElapsedTime();
    ri.controls.update(delta);

    updatePhysics(delta)
    updateLines();
    updateHingeMarkers();
    renderCamera();
    keyPresses();
    TWEEN.update(currentTime);

    const waterMesh = ri.scene.getObjectByName("myWater")
    waterMesh.material.uniforms.uTime.value = elapsed;
}


function threeAmmoObjects() {
    let position
    ground()
    water()
    rgMachine()

    // let ballPosition = {x: -5.2, y: 1.5, z: 10.2};
    // let ballRadius = 0.2
    // let ballMass = 10
    // ball(ballPosition, ballRadius, ballMass, 0.1, 1.0)
    //
    //
    // // Kan flyttes hvor som helst, kan ikke roteres
    // let dominoPosition = {x: 9.85, y: 1.6, z: -8};
    // let dominoPosition = {x: 0, y: 1.6, z: 0};
    // domino(dominoPosition)
    //
    // position = {x: 14, y: 7.05, z: -30.5}
    // plinko(position);
    // position = {x:16, y:15, z:-26}
    // arrow(position)
    //
    cannon();
    cannonTarget();
    golfclub();
    newtonCradle();
    spiral();
    //
    // // let position = {x: 10, y: 3, z: 10};
    // position = {x: 15, y: 5, z: -10};
    // funnel(position, 2.7, 0.3, 2)
    // position.y +=3
    // ball(position, 0.5, 2)
    // ball(position, 0.5, 2)
    //
    // position.x -= 1
    // position.y -= 3.7
    // // position = {x: 15, y: 3, z: -10};
    // rails(position, 180, 10, 7, true)
    //
    //
    // position.x += 7
    // position.y -= 1.5
    // // rails(position, 180, -5, 15)
    //
    // rails(position, 180, -0, 15, false)
    //
    // position.y += 1
    // position.x += 5
    // //ball(position, 0.5, 5)
    //
    // position.x += 1
    // //ball(position, 0.5, 5)
    //
    // position.x += 1
    // //ball(position, 0.5, 5)
    //
    // position.x += 1
    // ball(position, 0.5, 5)
    //
    // position = {x: -30, y: 2, z: 20};
    // steps(position,90, 8)
    //
    // // position = {x: -40, y: -4, z: 20};
    // // steps(position,90, 5)
    //
    //
    // position = {x: 10, y: 0, z: 5};
    // ball(position, 0.2, 0);
    //
    // position = {x: -5, y: 1.2, z: 10.2};
    // rails(position, Math.PI, 15, 6, false, 0.0)
    //
    // position = {x: 0, y: 10, z: -20};
    // ball(position, 0.3, 1, 0.97, 1);
    //
    // position = {x: 0, y: 1.5, z: -5};
    // rails(position, 270, -20, 18, false);
    //
    // position = {x: 0, y: 1.5, z: -5};
    // rails(position, 90, -5, 1.4, false);
}


function rgMachine() {
    let position;

    // Plinko
    position = {x: 24, y: 9, z: -30.5};
    let plinkoPosition = position
    plinko(plinkoPosition);

    // Starter ball
    position = {x: position.x + 4.9, y: position.y + 4.5, z: position.z + 5};
    rails(position, 180, -5, 3, true);

    position = {x: position.x + 2.5, y: position.y + 1.5, z: position.z};
    funnel(position, 3, 0.25, 1.6);

    position = {x: position.x - 2.8, y: position.y + 1.6, z: position.z};
    rails(position, 90, -10, 3);

    position = {x: position.x, y: position.y + 0.53, z: position.z + 2.95};
    rails(position, 90, 0.5, 1);

    position = {x: position.x, y: position.y, z: position.z + 1};
    rails(position, 90, -15, 0.2);

    position = {x: position.x, y: position.y + 0.5, z: position.z - 0.25};
    ball(position, 0.2, 8, 0.7, 0.8, 'starterBall');

    position = {x: position.x, y: position.y + 3, z: position.z + 0.25};
    arrow(position);

    // Domino
    position = {x: plinkoPosition.x - 4.15, y: plinkoPosition.y - 3.9, z: plinkoPosition.z + 15};
    rails(position, 90, -0.5, 1);

    let ballPosition = {x: position.x, y: position.y + 1, z: position.z + 0.5};
    ball(ballPosition, 0.3, 10, 0.7, 0.1);

    position = {x: position.x, y: position.y + 3, z: position.z + 0.25};
}