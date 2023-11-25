// noinspection JSPotentiallyInvalidConstructorUsage

import './style.css';
import * as THREE from "three";
import * as TWEEN from '@tweenjs/tween.js' // HUSK: npm install @tweenjs/tween.js
import {
    createConvexTriangleShapeAddToCompound,
    createTriangleShapeAddToCompound,
    generateTriangleShape
} from "./triangleMeshHelpers.js";

import {degToRad} from "three/src/math/MathUtils.js";
import {
    createMovable,
    moveRigidBody,
    moveRigidBodyAnimation, rotateRigidBody
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
    createPivotMarker,
    localToWorld,
    addLineBetweenObjects,
    updateLines
} from "./threeHelpers.js";

import {
    createAmmoWorld,
    updatePhysics,
    createAmmoRigidBody
} from "./ammoHelpers.js"

import {
    createAmmoMesh,
    ground
} from "./threeAmmoHelpers.js";


export const ri = {
    currentlyPressedKeys: [],
    springs: {
        cannonSpring: undefined,
    },
    camera: undefined,
    renderer: undefined,
    scene: undefined,
    raycaster: undefined,
    mouse: undefined,
    lilGui: undefined,
    balls: [],
    textures: {},
    uniforms: {}
}

export let phy = {
    ammoPhysicsWorld: undefined,
    rigidBodies: [],
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
    let paths = [
        'static/assets/skybox/bluecloud',
        'static/assets/skybox/browncloud',
        'static/assets/skybox/graycloud',
        'static/assets/skybox/yellowcloud'
    ]
    let path = paths[3]

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

    let delta = ri.clock.getDelta();
    let elapsed = ri.clock.getElapsedTime();

    updatePhysics(delta)
    updateLines();
    updateHingeMarkers();
    renderCamera();
    keyPresses();

    TWEEN.update(currentTime);

    let waterMesh = ri.scene.getObjectByName("myWater")
    waterMesh.material.uniforms.uTime.value = elapsed;
}

function threeAmmoObjects() {
    ground()
    water()

    let ballPosition = {x: -10.7, y: 5.5, z: 10.5};
    let ballRadius = 0.2
    let ballMass = 10
    ball(ballPosition, ballRadius, ballMass, 0.1, 0.5)


    // Kan flyttes hvor som helst, kan ikke roteres
    let dominoPosition = {x: 9.85, y: 1.6, z: -8};
    // dominoPosition = {x: 0, y: 1.6, z: 0};
    domino(dominoPosition)

    let position = {x: 14, y: 7.05, z: -30.5}
    plinko(position);
    position = {x:16, y:15, z:-26}
    arrow(position)

    cannon();
    golfclub();
    newtonCradle();
    spiral();

    // let position = {x: 10, y: 3, z: 10};
    position = {x: 15, y: 5, z: -10};
    funnel(position, 2.7, 0.3, 2)

    position.x -= 1
    position.y -= 0.7
    // position = {x: 15, y: 3, z: -10};
    rails(position, 180, 10, 7, true)


    position.x += 7
    position.y -= 1.5
    // rails(position, 180, -5, 15)

    rails(position, 180, -0, 15, false)

    position.y += 1
    position.x += 5
    //ball(position, 0.5, 5)

    position.x += 1
    //ball(position, 0.5, 5)

    position.x += 1
    //ball(position, 0.5, 5)

    position.x += 1
    ball(position, 0.5, 5)

    position = {x: -30, y: 2, z: 20};
    // cube(position, {x:1,y:1,z:1}, 0,'cube', 2)
    steps(position,90, 10)

    position = {x: 10, y: 0, z: 5};
    ball(position, 0.2, 0);

    position = {x: -10, y: 4.2, z: 10.5};
    rails(position, 0, -5, true)


}


function ball(position, radius, mass, restitution = 0.7, friction = 0.8) {
    // THREE
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        metalness: 0.5,
        roughness: 0.3});
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = 'ball';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // mesh.position.set(position.x, position.y, position.z);

    ri.scene.add(mesh);
    ri.balls.push(mesh)

    // AMMO
    let shape = new Ammo.btSphereShape(radius);
    let rigidBody = createAmmoRigidBody(shape, mesh, restitution, friction, position, mass);

    rigidBody.setActivationState(4)
    //mesh.userData.physicsBody
}

function cube(position, size, rotation = 0 , name = 'cube', mass = 0, color = 0xFF00FF, restitution = 0.5, friction = 0.8) {
    // THREE
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide});
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = name
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.y = rotation * Math.PI / 180

    ri.scene.add(mesh);

    // AMMO
    let shape = new Ammo.btBoxShape(new Ammo.btVector3(size.x/2, size.y/2, size.z/2));
    createAmmoRigidBody(shape, mesh, restitution, friction, position, mass);
}

function tableMesh(groupMesh, compoundShape, size, rotation, height, name = 'table', color = 0xFFFFFF) {
    let material = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide});

    groupMesh.name = name;
    // groupMesh.castShadow = true;
    // groupMesh.receiveShadow = true;

    let position = {x: 0, y: 0, z: 0};

    // tabletop
    let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    createAmmoMesh('box', geometry, size, position, rotation, material, groupMesh, compoundShape );

    // legs
    let width = (size.x + size.z) / 2 / 20;
    position.y = -height/2;
    let xOffset = size.x/2 - width;
    let zOffset = size.z/2 - width;
    let legSize = {x: width, y: height, z: width};

    position.x = xOffset;
    position.z = zOffset;
    geometry = new THREE.BoxGeometry(width, height, width);
    createAmmoMesh('box', geometry, legSize, position, rotation, material, groupMesh, compoundShape );

    position.x = -xOffset;
    geometry = new THREE.BoxGeometry(width, height, width);
    createAmmoMesh('box', geometry, legSize, position, rotation, material, groupMesh, compoundShape );

    position.z = -zOffset;
    geometry = new THREE.BoxGeometry(width, height, width);
    createAmmoMesh('box', geometry, legSize, position, rotation, material, groupMesh, compoundShape );

    position.x = xOffset;
    geometry = new THREE.BoxGeometry(width, height, width);
    createAmmoMesh('box', geometry, legSize, position, rotation, material, groupMesh, compoundShape );
}

function funnel(position, upperRadius = 2.7, lowerRadius = 0.5, height = 2) {
    // let rotation = {x: 0, z: 0};

    //Ammo-container:
    let compoundShape = new Ammo.btCompoundShape();

    let material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide,
        metalness: 0.4,
        roughness: 0.3});


    let points = [
        new THREE.Vector2(lowerRadius, 0),
        new THREE.Vector2(lowerRadius, height * 0.3),
        new THREE.Vector2(upperRadius, height),
    ];

    let geometry = new THREE.LatheGeometry(points, 128, 0, 2 * Math.PI);

    let mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'funnel';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.material.transparent = true;
    mesh.material.opacity = 0.5;

    ri.scene.add(mesh);

    createTriangleShapeAddToCompound(compoundShape, mesh);

    createAmmoRigidBody(compoundShape, mesh, 0.4, 0.6, position, 0);

    // Ball+rail to test funnel
    let railPosition = {x: position.x + upperRadius*0.9, y: position.y + height + 1, z: position.z + 5}
    rails(railPosition, -90, 10, 5)
    let ballPosition = {x: railPosition.x, y: railPosition.y + 0.6, z: railPosition.z - 0.2}
    ball(ballPosition, lowerRadius*0.9, 5, 0.85)
}

function rails(position, rotation = 180, tilt = 20, length = 4, guardrails = false) {
    let material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        metalness: 0.5,
        roughness: 0.3});

    let groupMesh = new THREE.Group();
    groupMesh.rotateY(degToRad(rotation));
    groupMesh.rotateZ(degToRad(90 + tilt));
    groupMesh.name = 'rails';

    let width = 0.05;
    let distance = 0.4;
    let size = {radius1: width, radius2: width, height: length};

    let compoundShape = new Ammo.btCompoundShape();
    let geometry = new THREE.CylinderGeometry(width, width, length, 36, 1);

    let railPosition = {x: 0, y: length/2, z: distance/2};

    // Rail 1:
    createAmmoMesh('cylinder', geometry, size, railPosition, {x: 0, y: 0, z: 0}, material, groupMesh, compoundShape );

    // Rail 2:
    railPosition.z = -distance/2;
    createAmmoMesh('cylinder', geometry, size, railPosition, {x: 0, y: 0, z: 0}, material, groupMesh, compoundShape );

    if (guardrails) {
        railPosition = {x: distance, y: length/2, z: distance * 1.0};
        // Guardrail 1:
        createAmmoMesh('cylinder', geometry, size, railPosition, {x: 0, y: 0, z: 0}, material, groupMesh, compoundShape );

        // Guardrail 2:
        railPosition.z = -distance * 1.0;
        createAmmoMesh('cylinder', geometry, size, railPosition, {x: 0, y: 0, z: 0}, material, groupMesh, compoundShape );
    }

    ri.scene.add(groupMesh);

    createAmmoRigidBody(compoundShape, groupMesh, 0, 0.8, position, 0);
}

function domino(position, starter = true) {
    const tableSize = {x: 5, y: 0.05, z: 10};

    let groupMesh = new THREE.Group();
    let compoundShape = new Ammo.btCompoundShape();

    tableMesh(groupMesh, compoundShape, tableSize, {x: 0, y: 0, z: 0}, position.y, 'dominoTable',  0x823c17)

    ri.scene.add(groupMesh);

    createAmmoRigidBody(compoundShape, groupMesh, 0.5, 0.5, position, 0);

    let dominoSize = {x: 0.4, y: 0.8, z: 0.08};
    let posX = position.x - 2.5;
    let posY = position.y + 0.5;
    let posZ = position.z - 5;
    let dominoPositions = [
        {x: posX + 2.5, y: posY, z: posZ + 0.1, rot: 0},
        {x: posX + 2.5, y: posY, z: posZ + 0.5, rot: 0},
        {x: posX + 2.5, y: posY, z: posZ + 0.9, rot: 0},
        {x: posX + 2.5, y: posY, z: posZ + 1.3, rot: 0},
        {x: posX + 2.55, y: posY, z: posZ + 1.7, rot: 10}, // turn left
        {x: posX + 2.65, y: posY, z: posZ + 2.1, rot: 20},
        {x: posX + 2.8, y: posY, z: posZ + 2.5, rot: 25},
        {x: posX + 3.0, y: posY, z: posZ + 2.9, rot: 25},
        {x: posX + 3.2, y: posY, z: posZ + 3.3, rot: 25},
        {x: posX + 3.35, y: posY, z: posZ + 3.7, rot: 20},
        {x: posX + 3.45, y: posY, z: posZ + 4.1, rot: 10},
        {x: posX + 3.5, y: posY, z: posZ + 4.5, rot: 0},
        {x: posX + 3.5, y: posY, z: posZ + 4.9, rot: 0},
        {x: posX + 3.5, y: posY, z: posZ + 5.3, rot: 0},
        {x: posX + 3.40, y: posY, z: posZ + 5.7, rot: -10},
        {x: posX + 3.30, y: posY, z: posZ + 6.1, rot: -10},
        {x: posX + 3.20, y: posY, z: posZ + 6.5, rot: -10},
        {x: posX + 3.10, y: posY, z: posZ + 6.9, rot: -10},
        {x: posX + 3.0, y: posY, z: posZ + 7.3, rot: -10},
        {x: posX + 2.9, y: posY, z: posZ + 7.7, rot: -10},
        {x: posX + 2.8, y: posY, z: posZ + 8.1, rot: -10},
        {x: posX + 2.7, y: posY, z: posZ + 8.5, rot: -10},
        {x: posX + 2.6, y: posY, z: posZ + 8.9, rot: -10},
        {x: posX + 2.5, y: posY, z: posZ + 9.3, rot: -10},
        {x: posX + 2.5, y: posY, z: posZ + 9.7, rot: 0},
    ]

    for (let i = 0; i < dominoPositions.length; i++) {
        cube(dominoPositions[i], dominoSize, dominoPositions[i].rot , 'dominoPiece', 20, 0x303030, 0.3, 0.8)
    }

    if (starter){
        // Ball to start first domino:
        let ballPosition = {x: position.x + 0, y: position.y + 1, z: position.z - 5.6};
        rails(ballPosition, -90, -20, 1);
        // ball(ballPosition, 0.45, 0);

        ballPosition.y += 0.35;
        ballPosition.z -= 0.9;
        rails(ballPosition, -90, 0, 1);

        ballPosition.y += 0.5;
        ballPosition.z -= 0.5;
        ball(ballPosition, 0.3, 10);

        // Ball to end domino:
        ballPosition = {x: position.x + 0, y: position.y + 0, z: position.z + 5.2};
        rails(ballPosition, 90, 0, 1);

        ballPosition.y += 0.5;
        ballPosition.z += 0.3;
        ball(ballPosition, 0.3, 10, 0.7, 0.1);

        ballPosition.y -= 0.5;
        ballPosition.z += 0.7;
        rails(ballPosition, 90, 20, 1);
    }
}

function plinko(position = {x: 14, y: 7.05, z: -30.5}) {

    let boardValues = {x: 20, y: 0.2, z: 12};
    let pegValues = {x: 0.08, y: 0.04, z: 0.5};
    let fenceValues = {x: 0.2, y: 0.8, z: 13};
    let rampValues = {x: 0.2, y: 0.8, z: 20};
    let topFrameValues = {x: 20.01, y: 0.8, z: 0.2};
    let sideFrameValues = {x: 0.8, y: 0.4, z: 9.28};
    let backFrameValues = {x: 0.8, y: 8.5, z: 0.8};
    let frontBottomFrameValues = {x: 20.01, y: 0.4, z: 0.2};

    const orangeColor = new THREE.MeshStandardMaterial({color: 0xF47004, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.5}); 
    const brownColor = new THREE.MeshStandardMaterial({color: 0xBC6A00,  side: THREE.DoubleSide, roughness: 0.3});
    const blackColor = new THREE.MeshStandardMaterial({color: 0x000500,  side: THREE.DoubleSide, roughness: 0.3, metalness: 0.8});

    let plinkoMesh = new THREE.Group();
    plinkoMesh.position.set(position.x, position.y, position.z);
    plinkoMesh.rotateY(90*Math.PI/180);
    plinkoMesh.rotateX(-45*Math.PI/180);
    let plinkoShape = new Ammo.btCompoundShape();

    let boardGeo = new THREE.BoxGeometry(boardValues.x, boardValues.y, boardValues.z);
    let plinkoBoard = createAmmoMesh('box', boardGeo, boardValues, {x:-5, y: 0, z:0}, {x: 0, y: 0, z: 0}, orangeColor, plinkoMesh, plinkoShape);
    
    let fenceGeo = new THREE.BoxGeometry(fenceValues.x, fenceValues.y, fenceValues.z);
    let fence = createAmmoMesh('box', fenceGeo, fenceValues, {x:0.2, y: 0.4, z: 1.2}, {x: 0, y: -45*Math.PI/180, z: 0}, brownColor, plinkoMesh, plinkoShape);
    let secondFence = createAmmoMesh('box', fenceGeo, fenceValues, {x:-10.2, y: 0.4, z: 1.2}, {x: 0, y: 45*Math.PI/180, z: 0}, brownColor, plinkoMesh, plinkoShape);

    let rampGeo = new THREE.BoxGeometry(rampValues.x, rampValues.y, rampValues.z);
    let ramp = createAmmoMesh('box', rampGeo, rampValues, {x:-5.05, y: 0.4, z: -4.65}, {x: 0, y: 83*Math.PI/180, z: 0}, brownColor, plinkoMesh, plinkoShape);

    let topFrameGeo = new THREE.BoxGeometry(topFrameValues.x, topFrameValues.y, topFrameValues.z);
    let topFrame = createAmmoMesh('box', topFrameGeo, topFrameValues, {x: -5, y: -0.24, z: 6.206}, {x: -45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);

    let frontBottomFrameGeo = new THREE.BoxGeometry(frontBottomFrameValues.x, frontBottomFrameValues.y, frontBottomFrameValues.z);
    let bottomFrontFrame = createAmmoMesh('box', frontBottomFrameGeo, frontBottomFrameValues, {x: -5, y: -0.075, z: -6.075}, {x: -135*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);

    let bottomFrameGeo = new THREE.BoxGeometry(sideFrameValues.x, sideFrameValues.y, sideFrameValues.z);
    let bottomLeftFrame = createAmmoMesh('box', bottomFrameGeo, sideFrameValues, {x: 4.602, y: -3.3, z: -2.85}, {x: 45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);
    let bottomRightFrame = createAmmoMesh('box', bottomFrameGeo, sideFrameValues, {x: -14.602, y: -3.3, z: -2.85}, {x: 45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);
    
    let backFrameGeo = new THREE.BoxGeometry(backFrameValues.x, backFrameValues.y, backFrameValues.z);
    let backLeftFrame = createAmmoMesh('box', backFrameGeo, sideFrameValues, {x: 4.602, y: -3.2, z: 3.245}, {x: 45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);
    let backRightFrame = createAmmoMesh('box', backFrameGeo, sideFrameValues, {x: -14.602, y: -3.2, z: 3.245}, {x: 45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);

    let pegGeo = new THREE.CylinderGeometry(pegValues.x, pegValues.y, pegValues.z, 36, 1);

    let x = -5;
    let y = 0;
    let count = 1;
    for (let i = 0; i < 18; i++){
        for (let j = 0; j < count; j++) {
            let peg = createAmmoMesh('cylinder', pegGeo, pegValues, {x: x+j, y: 0.4, z: 5.5+y}, {x: 0, y: 0, z: 0}, blackColor, plinkoMesh, plinkoShape);
            
        }
        count +=1
        x += -0.5;
        y += -0.5;
    }

    createAmmoRigidBody(plinkoShape, plinkoMesh, 1, 1, plinkoMesh.position, 0);

    ri.scene.add(plinkoMesh);

    // {x: 14, y: 7.05, z: -30.5}
    // position.x, position.y, position.z
    let ballPosition = {x: 18.8, y: 11.5, z: -25.5}; //x: 17, y: 12, z: -27
    ballPosition = {x: position.x + 4.8, y: position.y + 4.45, z: position.z + 5}; //x: 17, y: 12, z: -27
    ball(ballPosition, 0.2, 5)

    let ballPosition2 = {x: 18.9, y: 20, z: -25.5}; //x: 19, y: 20, z: -26
    ballPosition2 = {x: position.x + 4.9, y: position.y + 13, z: position.z + 5};
    ball(ballPosition2, 0.20, 3)

}

function golfclub() {
    let position = {x: 40, y: 16.51, z: 40};
    let handleBarValues = {x: 0.2, y: 0.1, z: 4};
    let shaftValues = {x: 0.1, y: 0.1, z: 10};
    let connectorValues = {x: 0.15, y: 0.15, z: 0.4};
    let clubValues = {x: 0.3, y: 0.5, z: 1.5};
    
    const lightGreyColor = new THREE.MeshStandardMaterial({color: 0xFCFCFF, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.5}); 
    const brownColor = new THREE.MeshStandardMaterial({color: 0xBC6A00,  side: THREE.DoubleSide, roughness: 0.3});
    const blackColor = new THREE.MeshStandardMaterial({color: 0x000500,  side: THREE.DoubleSide, roughness: 0.3});

    let golfClubMesh = new THREE.Group();
    golfClubMesh.position.set( position.x, position.y, position.z);
    golfClubMesh.rotateZ(145*Math.PI/180);
    let golfClubShape = new Ammo.btCompoundShape();

    let handleBarGeo = new THREE.CylinderGeometry(handleBarValues.x, handleBarValues.y, handleBarValues.z, 36, 1);
    let handleBar = createAmmoMesh('cylinder', handleBarGeo, handleBarValues, {x: 0, y: 7, z: 0}, {x: 0, y: 0, z: 0}, blackColor, golfClubMesh, golfClubShape);
    let shaftGeo = new THREE.CylinderGeometry(shaftValues.x, shaftValues.y, shaftValues.z, 36, 1);
    let shaft = createAmmoMesh('cylinder', shaftGeo, handleBarValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, lightGreyColor, golfClubMesh, golfClubShape);
    let connectorGeo = new THREE.CylinderGeometry(connectorValues.x, connectorValues.y, connectorValues.z, 36, 1);
    let connector = createAmmoMesh('cylinder', connectorGeo, connectorValues, {x: 0, y: -5, z: 0}, {x: 0, y: 0, z: 0}, blackColor, golfClubMesh, golfClubShape);
    let clubGeo = new THREE.BoxGeometry(clubValues.x, clubValues.y, clubValues.z);
    let club = createAmmoMesh('box', clubGeo, clubValues, {x: 0, y: -5.4, z: 0.6}, {x: 0, y: 0, z: 0}, lightGreyColor, golfClubMesh, golfClubShape);
    
    let golfClubRigid = createAmmoRigidBody(golfClubShape, golfClubMesh, 0, 0, golfClubMesh.position, 20);


    let golfClubStandMesh = new THREE.Group();
    golfClubStandMesh.position.set( position.x, position.y, position.z);
    let golfClubStandShape = new Ammo.btCompoundShape();

    let hingeValues = {x: 0.4, y: 0.4, z: 8};
    let LegValues = {x: 1.4, y: 17, z: 1.4};
    let topBarValues = {x: 0.4, y: 0.4, z: 6};
    let stopperHingeValues = {x: 0.1, y: 0.1, z: 1};

    let hingeGeo = new THREE.CylinderGeometry(hingeValues.x, hingeValues.y, hingeValues.z, 36, 1);
    let hinge = createAmmoMesh('cylinder', hingeGeo, hingeValues, {x: 0, y: 0, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, lightGreyColor, golfClubStandMesh, golfClubStandShape);
    let leftLegGeo = new THREE.BoxGeometry(LegValues.x, LegValues.y, LegValues.z);
    let leftLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 0, y: -8, z: -4}, {x: 0, y: 0, z: 0}, brownColor, golfClubStandMesh, golfClubStandShape);
    let rightLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 0, y: -8, z: 4}, {x: 0, y: 0, z: 0}, brownColor, golfClubStandMesh, golfClubStandShape);
    let backLeftLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 6, y: -8, z: -4}, {x: 0, y: 0, z: 0}, brownColor, golfClubStandMesh, golfClubStandShape);
    let backRightLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 6, y: -8, z: 4}, {x: 0, y: 0, z: 0}, brownColor, golfClubStandMesh, golfClubStandShape);
    let topBarGeo = new THREE.CylinderGeometry(topBarValues.x, topBarValues.y, topBarValues.z, 36, 1);
    let topLeftBar = createAmmoMesh('cylinder', topBarGeo, topBarValues, {x: 2.5, y: 0, z: -4}, {x: 0, y: 0, z: 90*Math.PI/180}, lightGreyColor, golfClubStandMesh, golfClubStandShape);
    let topRightBar = createAmmoMesh('cylinder', topBarGeo, topBarValues, {x: 2.5, y: 0, z: 4}, {x: 0, y: 0, z: 90*Math.PI/180}, lightGreyColor, golfClubStandMesh, golfClubStandShape);
    let stopperHingeGeo = new THREE.CylinderGeometry(stopperHingeValues.x, stopperHingeValues.y, stopperHingeValues.z, 36, 1);
    let stopperLeftHinge = createAmmoMesh('cylinder', stopperHingeGeo, stopperHingeValues, {x: 7, y: -7.5, z: -4}, {x: 0, y: 0, z: 90*Math.PI/180}, lightGreyColor, golfClubStandMesh, golfClubStandShape);
    let stopperRightHinge = createAmmoMesh('cylinder', stopperHingeGeo, stopperHingeValues, {x: 7, y: -7.5, z: 4}, {x: 0, y: 0, z: 90*Math.PI/180}, lightGreyColor, golfClubStandMesh, golfClubStandShape);

    let golfClubStandRigid = createAmmoRigidBody(golfClubStandShape, golfClubStandMesh, 0, 1, golfClubStandMesh.position, 0);
    //Benyttet kode eksempler utgitt av Werner Farstad. Hentet fra https://source.coderefinery.org/3d/threejs23_std/-/blob/main/src/modul7/ammoConstraints/armHingeConstraint.js?ref_type=heads
    let pivotStand = new Ammo.btVector3(0, 0, 0);
    let axisStand = new Ammo.btVector3(0, 0, 1);
    let pivotClub = new Ammo.btVector3(0, 9.35, 0);
    let axisClub = new Ammo.btVector3(0, 0, 1);
    let ClubHinge = new Ammo.btHingeConstraint(golfClubStandRigid, golfClubRigid, pivotStand, pivotClub, axisStand, axisClub, false);
    ClubHinge.setLimit(-Math.PI/2, Math.PI/2, 1, 1, 1);
    ClubHinge.enableAngularMotor(true, 0, 4);
    phy.ammoPhysicsWorld.addConstraint(ClubHinge, true);

    let golfClubStopperMesh = new THREE.Group();
    golfClubStopperMesh.position.set(position.x + 7.2, position.y -7, position.z);
    let golfClubStopperShape = new Ammo.btCompoundShape();
    let stopperValues = {x: 0.2, y: 0.2, z: 10};
    let stopperGeo = new THREE.CylinderGeometry(stopperValues.x, stopperValues.y, stopperValues.z, 36, 1);
    let stopper = createAmmoMesh('cylinder', stopperGeo, stopperValues, {x: 0, y: 0, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, lightGreyColor, golfClubStopperMesh, golfClubStopperShape);
    let golfClubStopperRigid = createAmmoRigidBody(golfClubStopperShape, golfClubStopperMesh, 0, 1, golfClubStopperMesh.position, 3);
    
    
    ri.scene.add(golfClubStopperMesh);
    ri.scene.add(golfClubStandMesh);
    ri.scene.add(golfClubMesh);

    let ballPosition = {x: position.x, y: position.y-15.5, z: position.z};
    let ballRadius = 1
    let ballMass = 0.1
    ball(ballPosition, ballRadius, ballMass);
}

function cannon() {
    //Benyttet kode eksempler utgitt av Werner Farstad. Hentet fra: https://source.coderefinery.org/3d/threejs23_std/-/blob/main/src/modul7/ammoConstraints/springGeneric6DofSpringConstraint.js?ref_type=heads
    let position = {x: 47, y: 3.76, z: 20};
    let rotationDegree =66.2*Math.PI/180;
    let rotationAxis = 'X';
    let bottomSpringValues = {x: 0.9, y: 0.9, z: 0.2};
    let topSpringValues = {x: 0.9, y: 0.9, z: 0.2};

    const lightGreyColor = new THREE.MeshStandardMaterial({color: 0xFCFCFF, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.5}); 
    const brownColor = new THREE.MeshStandardMaterial({color: 0xBC6A00,  side: THREE.DoubleSide, roughness: 0.3});
    const blackColor = new THREE.MeshStandardMaterial({color: 0x000500,  side: THREE.DoubleSide, roughness: 0.3, metalness: 0.8});

    let bottomSpringMesh = new THREE.Group();
    bottomSpringMesh.position.set(position.x, position.y ,position.z);
    
    if (rotationAxis == "Z") 
        {bottomSpringMesh.rotateZ(rotationDegree)}
    else {bottomSpringMesh.rotateX(rotationDegree)};

    let bottomSpringShape = new Ammo.btCompoundShape();

    let bottomSpringGeo = new THREE.CylinderGeometry(bottomSpringValues.x, bottomSpringValues.y, bottomSpringValues.z, 36, 1);
    let bottomSpring = createAmmoMesh('cylinder', bottomSpringGeo, bottomSpringValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, lightGreyColor, bottomSpringMesh, bottomSpringShape);

    let topSpringMesh = new THREE.Group();
    topSpringMesh.position.set(position.x, position.y+0.1 ,position.z);
    if (rotationAxis == "Z") 
        {topSpringMesh.rotateZ(rotationDegree)}
    else {topSpringMesh.rotateX(rotationDegree)};

    let topSpringShape = new Ammo.btCompoundShape();
    let topSpringGeo = new THREE.CylinderGeometry(topSpringValues.x, topSpringValues.y, topSpringValues.z, 36, 1);
    let topSpring2 = createAmmoMesh('cylinder', topSpringGeo, topSpringValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, blackColor, topSpringMesh, topSpringShape);

    let rigidTopSpring = createAmmoRigidBody(bottomSpringShape, bottomSpringMesh, 1, 1, bottomSpringMesh.position, 0);
    let rigidBottomSpring = createAmmoRigidBody(topSpringShape, topSpringMesh, 1, 1, topSpringMesh.position, 10);
    rigidTopSpring.setActivationState(4);
    rigidBottomSpring.setActivationState(4);

    let spring = new Ammo.btGeneric6DofSpringConstraint(rigidTopSpring, rigidBottomSpring, bottomSpring.transform, topSpring2.transform, false);
    spring.name = "cannonSpring";

    spring.setLinearLowerLimit(new Ammo.btVector3(0, 1, 0));
    spring.setLinearUpperLimit(new Ammo.btVector3(0, 0, 0));
    spring.setAngularLowerLimit(new Ammo.btVector3(0, 0, 0));
    spring.setAngularUpperLimit(new Ammo.btVector3(0, 0, 0));

    spring.enableSpring(1, false);
    spring.setStiffness(1, 6000);
    spring.setDamping(1, 100);
    spring.setEquilibriumPoint(1, 2);

    phy.ammoPhysicsWorld.addConstraint(spring, false);
    ri.springs.cannonSpring = spring;

    //cannonbody LatheGeometry
    let cannonBodyShape = new Ammo.btCompoundShape();

    let material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide,
        metalness: 0.4,
        roughness: 0.3});


    let height = 8;
    let radius = 1;
    let points = [
        new THREE.Vector2(radius, height*0.1),
        new THREE.Vector2(radius, height*1),
    ];



    let cannonBodyGeo = new THREE.LatheGeometry(points, 128, 0, 2 * Math.PI);
    let cannonBodyMesh = new THREE.Mesh(cannonBodyGeo, material);
    
    if (rotationAxis == "Z") 
        {cannonBodyMesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationDegree)}
    else {cannonBodyMesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationDegree)};

    cannonBodyMesh.name = 'cannonBody';
    cannonBodyMesh.castShadow = true;
    cannonBodyMesh.receiveShadow = true;

    cannonBodyMesh.material.transparent = true;
    cannonBodyMesh.material.opacity = 0.1;

   
    createAmmoMesh('triangleShape', cannonBodyGeo, cannonBodyMesh, {x: 0, y: -1.5, z: 0}, {x: 0, y: 0, z: 0}, blackColor, bottomSpringMesh, cannonBodyShape, 'cannonBody')
    createAmmoRigidBody(cannonBodyShape, cannonBodyMesh, 0.4, 0.6, {x: position.x, y: position.y, z: position.z}, 0);
    

    //cannonEnd
    let cannonEndValues = {radius: 1, segments: 32}
    let cannonEndGeo = new THREE.SphereGeometry(cannonEndValues.radius, cannonEndValues.segments, cannonEndValues.segments, 0 , Math.PI);
    let cannonEnd = createAmmoMesh('sphere', cannonEndGeo, cannonEndValues, {x: 0, y: -0.5, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, blackColor, bottomSpringMesh, bottomSpringShape);
    
    //cannonStand
    let cannonStandMesh = new THREE.Group();
    cannonStandMesh.position.set(position.x, position.y ,position.z);
    cannonStandMesh.rotateY(90*Math.PI/180);

    if (rotationAxis == "Z") 
        {cannonStandMesh.rotateY(0*Math.PI/180);}
    else {cannonStandMesh.rotateY(90*Math.PI/180);};

    let cannonStandShape = new Ammo.btCompoundShape();
    let cannonStandValues = {x: 0.4, y: 4.5, z: 2};
    let cannonStandBottomValues = {x: 0.4, y: 2.8, z: 2};
    let axisStandValues = {x: 0.2, y: 0.2, z: 0.3};
    let cannonStandGeo = new THREE.BoxGeometry(cannonStandValues.x, cannonStandValues.y, cannonStandValues.z);
    let cannonStandBottomGeo = new THREE.BoxGeometry(cannonStandBottomValues.x, cannonStandBottomValues.y, cannonStandBottomValues.z);
    let leftLeg = createAmmoMesh('box', cannonStandGeo, cannonStandValues, {x: -1.2, y: -1.5, z: 0}, {x: 0, y: 0, z: 0}, brownColor, cannonStandMesh, cannonStandShape);
    let rightLeg = createAmmoMesh('box', cannonStandGeo, cannonStandValues, {x: 1.2, y: -1.5, z: 0}, {x: 0, y: 0, z: 0}, brownColor, cannonStandMesh, cannonStandShape);
    let standBottom = createAmmoMesh('box', cannonStandBottomGeo, cannonStandBottomValues, {x: 0, y: -3.55, z: 0}, {x: 0, y: 0, z: 90*Math.PI/180}, brownColor, cannonStandMesh, cannonStandShape);
    let axisGeo = new THREE.CylinderGeometry(axisStandValues.x, axisStandValues.y, axisStandValues.z, 36, 1);
    let leftAxis = createAmmoMesh('cylinder', axisGeo, axisStandValues, {x: -1.35, y: 0, z: 0}, {x: 0, y: 0, z: 90*Math.PI/180}, blackColor, cannonStandMesh, cannonStandShape)
    let rightAxis = createAmmoMesh('cylinder', axisGeo, axisStandValues, {x: 1.35, y: 0, z: 0}, {x: 0, y: 0, z: 90*Math.PI/180}, blackColor, cannonStandMesh, cannonStandShape)


    ri.scene.add(bottomSpringMesh);
    ri.scene.add(topSpringMesh);
    ri.scene.add(cannonStandMesh);

    let ballPosition = {x: position.x-0.1, y: position.y+1, z: position.z};
    if (rotationAxis == "Z") 
        {ballPosition = {x: position.x-2, y: position.y+1, z: position.z};}
    else {ballPosition = {x: position.x, y: position.y, z: position.z+1.2};};
    let ballRadius = 0.4
    let ballMass = 10
    ball(ballPosition, ballRadius, ballMass);

}

function newtonCradle() {
    const materialDarkGrey = new THREE.MeshStandardMaterial({map: ri.textures.darkGrey, side: THREE.DoubleSide});
    const transparent = new THREE.MeshStandardMaterial({map: ri.textures.darkGrey, side: THREE.DoubleSide});
    const colorGrey = new THREE.MeshStandardMaterial({color: 0xffffff, side: THREE.DoubleSide});

    let topBoxValues = {x: 0.25, y: 0.25, z: 5};
    let bottomBoxConnectorValues = {x: 2, y: 0.25, z: 0.25};
    let riserBoxValues = {x: 0.25, y: 4, z: 0.25};
    let ballValues = {radius: 0.3, segments: 32};
    let cradleMeshPosition = {x: 0, y: -2, z: 0};
    let cradleMesh = new THREE.Group();
    cradleMesh.name = "cradleMesh";
    cradleMesh.position.set( cradleMeshPosition.x, cradleMeshPosition.y, cradleMeshPosition.z);
    let cradleTopBarPosition1 = {x: 1, y: 6-0.125, z: 0};
    let cradleTopBarPosition2 = {x: -1, y: 6-0.125, z: 0};
    let cradleShape = new Ammo.btCompoundShape();

    let cradleBottomGeo = new THREE.BoxGeometry(topBoxValues.x, topBoxValues.y, topBoxValues.z);

    let cradleConnectorGeo = new THREE.BoxGeometry(bottomBoxConnectorValues.x, bottomBoxConnectorValues.y, bottomBoxConnectorValues.z);
    let cradleConnectorBar1 = createAmmoMesh('box', cradleConnectorGeo, bottomBoxConnectorValues, {x: 0, y: 2+0.125, z: 2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleConnectorBar2 = createAmmoMesh('box', cradleConnectorGeo, bottomBoxConnectorValues, {x: 0, y: 2+0.125, z: -2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);

    let cradleRiserGeo = new THREE.BoxGeometry(riserBoxValues.x, riserBoxValues.y, riserBoxValues.z);
    let cradleRiserBar1  = createAmmoMesh('box', cradleRiserGeo, riserBoxValues, {x: 1, y: 4, z: 2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleRiserBar2  = createAmmoMesh('box', cradleRiserGeo, riserBoxValues, {x: 1, y: 4, z: -2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleRiserBar3  = createAmmoMesh('box', cradleRiserGeo, riserBoxValues, {x: -1, y: 4, z: 2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleRiserBar4  = createAmmoMesh('box', cradleRiserGeo, riserBoxValues, {x: -1, y: 4, z: -2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleTopBar1 = createAmmoMesh('box', cradleBottomGeo, topBoxValues, cradleTopBarPosition1, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape, "cradleTopBar1");
    let cradleTopBar2 = createAmmoMesh('box', cradleBottomGeo, topBoxValues, cradleTopBarPosition2, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape, "cradleTopBar2");

    ri.scene.add(cradleMesh);
    let cradleRigid = createAmmoRigidBody(cradleShape, cradleMesh, 0.1, 1, cradleMesh.position, 0);

    let ballShape = new Ammo.btCompoundShape();

    let ballList = [];

    let anchorShape = new Ammo.btCompoundShape()
    let anchorSize = {x: 0.1, y: 0.1, z: 0.1};
    let anchorGeo = new THREE.BoxGeometry(anchorSize.x,anchorSize.y,anchorSize.z);
    let ballGeo = new THREE.SphereGeometry(ballValues.radius, ballValues.segments, ballValues.segments);
    let ballPosition = ballValues.radius * 7;
    for (let i = 0; i < 8; ++i) {
        let anchor1Mesh = new THREE.Group();
        anchor1Mesh.name = "anchor1Mesh" + i;
        let anchor1 = createAmmoMesh('box', anchorGeo, anchorSize, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, anchor1Mesh, anchorShape);
        let anchor1Body = createAmmoRigidBody(anchorShape, anchor1Mesh, 0, 1, {x: cradleMeshPosition.x - 1, y: cradleMeshPosition.y+6-0.125, z: cradleMeshPosition.z + ballPosition}, 0);
        ri.scene.add(anchor1Mesh);

        let anchor2Mesh = new THREE.Group();
        anchor2Mesh.name = "anchor2Mesh" + i;
        let anchor2 = createAmmoMesh('box', anchorGeo, anchorSize, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, anchor2Mesh, anchorShape);
        let anchor2Body = createAmmoRigidBody(anchorShape, anchor2Mesh, 0, 1, {x: cradleMeshPosition.x + 1, y: cradleMeshPosition.y + 6-0.125, z: ballPosition}, 0);
        ri.scene.add(anchor2Mesh);

        let ballMesh = new THREE.Group();
        ballList[i] = new THREE.Group();
        ballList[i].name = "ball" + i + "Mesh";
        let ball = createAmmoMesh('sphere', ballGeo, ballValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, ballList[i], ballShape, ballList[i].name);
        let ballBody;

        if (i === 7) {
            ballBody = createAmmoRigidBody(ballShape, ballList[i], 0.99,1.0, {x: cradleMeshPosition.x, y: cradleMeshPosition.y + 1 - 0.125, z: cradleMeshPosition.z + ballPosition}, 1);
            ballBody.setActivationState(4);
            ballBody.applyCentralImpulse( new Ammo.btVector3(0, 0, -30 ));
        } else {
            ballBody = createAmmoRigidBody(ballShape, ballList[i], 0.99,1.0, {x: cradleMeshPosition.x, y: cradleMeshPosition.y + 1 - 0.125, z: cradleMeshPosition.z + ballPosition}, 1);
            ballBody.setActivationState(4);
        }

        ri.scene.add(ballList[i]);

        let anchorPivot = new Ammo.btVector3(1, 0, 0);
        let ballPivot = new Ammo.btVector3(0, 3, 0);

        let axis = new Ammo.btVector3(1, 0, 0);
        let hinge = new Ammo.btHingeConstraint(anchor1Body, ballBody, anchorPivot, ballPivot, axis, axis, false);
        hinge.setLimit(-Math.PI/2, Math.PI/2, 0.9, 0.3, 1);
        hinge.enableAngularMotor(false, 0, 0);
        phy.ammoPhysicsWorld.addConstraint(hinge, true);

        addLineBetweenObjects("anchor1Mesh" + i, "cradleMesh", {x: 0, y: 0, z: ballPosition}, {x: 0, y: 0, z: ballPosition}, cradleTopBar1.mesh.name, "lineToTopBar1_" + i);
        addLineBetweenObjects("anchor2Mesh" + i, "cradleMesh", {x: 0, y: 0, z: ballPosition}, {x: 0, y: 0, z: ballPosition}, cradleTopBar2.mesh.name, "lineToTopBar2_" + i);

        //let anchorWorldPivot = localToWorld(anchor1Body, anchorPivot);
        //let ballWorldPivot = localToWorld(ballBody, ballPivot);
        //let anchorPivotMarker = createPivotMarker(anchorWorldPivot, 0x00ffff);
        //let ballPivotMarker = createPivotMarker(ballWorldPivot);
        //anchorPivotMarker.name = "anchorMarker_" + i;
        //ballPivotMarker.name = "ballMarker_" + i;
        //ri.scene.add(anchorPivotMarker);
        //ri.scene.add(ballPivotMarker);

        ballPosition = ballPosition - (ballValues.radius * 2);
    }

    // Testing av cradle physics
    // let railPosition = {
    //     x: cradleMesh.position.x,
    //     y: cradleTopBar1.mesh.position.y - 5.3,
    //     z: cradleMesh.position.z - 2.8
    // };
    // railPosition.z += 4;
    // console.log(railPosition);
    // rails(railPosition, 90, -20, 8);
    // rails(railPosition, -90, 0, 4);
    //
    // let testBallPosition = {
    //     x: railPosition.x,
    //     y: railPosition.y + 3,
    //     z: railPosition.z + 7,
    // };
    // ball(testBallPosition, 0.3, 1000);

}

function updateHingeMarkers() {
    for (let i = 0; i < 8; ++i) {
        let anchorMesh = ri.scene.getObjectByName("anchor1Mesh" + i);
        let ballMesh = ri.scene.getObjectByName("ball" + i + "Mesh");

        if (anchorMesh && ballMesh) {
            let anchorBody = anchorMesh.userData.physicsBody;
            let ballBody = ballMesh.userData.physicsBody;

            if (anchorBody && ballBody) {
                let anchorTransform = new Ammo.btTransform();
                let ballTransform = new Ammo.btTransform();

                anchorBody.getMotionState().getWorldTransform(anchorTransform);
                ballBody.getMotionState().getWorldTransform(ballTransform);

                let anchorPosition = anchorTransform.getOrigin();
                let ballPosition = ballTransform.getOrigin();

                let anchorMarker = ri.scene.getObjectByName("anchorMarker_" + i);
                let ballMarker = ri.scene.getObjectByName("ballMarker_" + i);

                if (anchorMarker) {
                    anchorMarker.position.set(0, 4, anchorPosition.z());
                }
                if (ballMarker) {
                    ballMarker.position.set(0, 4, ballPosition.z());
                }

                Ammo.destroy(anchorTransform);
                Ammo.destroy(ballTransform);
            }
        }
    }
}

function spiral() {
    const numTurns = 20;
    const height = numTurns/5;
    const boxSize = 0.05; // Size of each box
    const radius = 0.5;    // Radius of the spiral
    let spiralMesh = new THREE.Group();
    spiralMesh.position.set(-10, 0.1, 10);
    spiralMesh.name = "spiral";
    let spiralShape = new Ammo.btCompoundShape();
    const materialDarkGrey = new THREE.MeshPhongMaterial({map: ri.textures.darkGrey, side: THREE.DoubleSide});
    const transparent = new THREE.MeshPhongMaterial()
    const boxGeometry = new THREE.BoxGeometry(boxSize*10, boxSize, boxSize);
    const centerCylinderGeometry = new THREE.CylinderGeometry(radius/2, radius/2, numTurns/5, 32, 1, false);
    createAmmoMesh('cylinder', centerCylinderGeometry, {x: 0, y: 0, z: 0}, {x: 0, y: numTurns/5/2, z: 0}, {x: 0, y: 0, z: 0}, materialDarkGrey, spiralMesh, spiralShape, "")
    for (let i = 0; i < numTurns * 20; i++) {
        const angle = (i / 120) * Math.PI * 2; // Full circle for each turn
        const x = radius * Math.cos(angle);
        const y = (height / (numTurns * 20)) * i;
        const z = radius * Math.sin(angle);
        const position = {x: x, y: y, z: z}
        const radialVector = new THREE.Vector3(x, 0, z);
        radialVector.normalize();
        const remainingHeight = height - position.y;
        const wallBoxHeight = Math.min(boxSize * 10, remainingHeight);
        const wallBoxGeometry = new THREE.BoxGeometry(boxSize, wallBoxHeight, boxSize);
        const wallBoxPosition = {
            x: position.x + radialVector.x * boxSize * 5,
            y: position.y + wallBoxHeight / 2, // Center the box vertically based on its height
            z: position.z + radialVector.z * boxSize * 5
        };

        let wallBoxRotation = new THREE.Vector3(0, 0, 0); // Assuming vertical along the Y-axis

        // Create and add the wall box
        createAmmoMesh('box', wallBoxGeometry, {x: 0, y: 0, z: 0}, wallBoxPosition, wallBoxRotation, materialDarkGrey, spiralMesh, spiralShape, "", "quaternion_norm");
        let spiralStep = createAmmoMesh('box', boxGeometry, {x: 0, y: 0, z: 0}, {x: position.x, y: position.y, z: position.z}, {x: radialVector.x, y: radialVector.y, z: radialVector.z}, materialDarkGrey, spiralMesh, spiralShape, "", "quaternion_norm");
    }
    let spiralBody = createAmmoRigidBody(spiralShape, spiralMesh, 1, 1, spiralMesh.position, 0);
    ri.scene.add(spiralMesh);
}


function steps(position, rotation = 0, numberOfSteps = 6) {
    let groupMesh = new THREE.Group();
    let stepMesh1 = new THREE.Group();
    let stepMesh2 = new THREE.Group();
    let wallGroupMesh = new THREE.Group();
    let compoundShape1 = new Ammo.btCompoundShape();
    let compoundShape2 = new Ammo.btCompoundShape();
    let wallCompoundShape = new Ammo.btCompoundShape();

    let mass = 0;
    let size = {x:1.5,y:8,z:1.5};
    let name = 'steps'
    let offset = 2 // height offset per step

    let stepShape = new THREE.Shape();
    stepShape.moveTo( -size.x/2,-size.y/2 );
    stepShape.lineTo(-size.x/2, size.y/2);
    stepShape.lineTo(size.x/2, size.y/2 * 0.8);
    stepShape.lineTo(size.x/2, -size.y/2);

    let wallShape = new THREE.Shape();
    wallShape.moveTo( -size.x/2,0 );
    wallShape.lineTo(-size.x/2, size.y/2 + offset);
    wallShape.lineTo(-size.x/2 + numberOfSteps*size.x, size.y/2 + numberOfSteps*offset);
    wallShape.lineTo(-size.x/2 + numberOfSteps*size.x, -offset + numberOfSteps*offset);

    const stepExtrudeSettings = {
        depth: size.z,
        bevelEnabled: false,
    };
    const wallExtrudeSettings = {
        depth: 0.3,
        bevelEnabled: false,
    };

    let stepGeometry = new THREE.ExtrudeGeometry( stepShape, stepExtrudeSettings );
    let stepMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0044,
        side: THREE.DoubleSide});

    let wallGeometry = new THREE.ExtrudeGeometry( wallShape, wallExtrudeSettings );
    let wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3});

    let mesh = new THREE.Mesh(stepGeometry, new THREE.MeshBasicMaterial());
    let wallMesh = new THREE.Mesh(wallGeometry, new THREE.MeshBasicMaterial());

    let useFirst = true;

    for (let i = 0; i <numberOfSteps; i++) {
        if (useFirst) {// createAmmoMesh('box', geometry, size, {x: i * size.x, y: 0, z: 0}, {x: 0, y: 0, z: 0},material, stepMesh1, compoundShape1, 'step1')
            createAmmoMesh('triangleShape', stepGeometry, mesh, {x: i * size.x, y: i * offset, z: -size.z/2}, {x: 0, y: 0, z: 0}, stepMaterial, stepMesh1, compoundShape1, 'step1')// stepMesh1.add(mesh)
        }
        else {// createAmmoMesh('box', geometry, size, {x: i * size.x, y: 0, z: 0}, {x: 0, y: 0, z: 0},material, stepMesh2, compoundShape2, 'step2')
            createAmmoMesh('triangleShape', stepGeometry, mesh, {x: i * size.x, y: i * offset, z: -size.z/2}, {x: 0, y: 0, z: 0}, stepMaterial, stepMesh2, compoundShape2, 'step1')// stepMesh2.add(mesh)
        }
        useFirst = !useFirst;
    }

    // Sidewalls
    createAmmoMesh('triangleShape', wallGeometry, wallMesh, {x: 0, y: 0, z: -0.3 - size.z/2}, {x: 0, y: 0, z: 0}, wallMaterial, wallGroupMesh, wallCompoundShape, 'wall')
    createAmmoMesh('triangleShape', wallGeometry, wallMesh, {x: 0, y: 0, z: size.z/2}, {x: 0, y: 0, z: 0}, wallMaterial, wallGroupMesh, wallCompoundShape, 'wall')

    groupMesh.name = name
    groupMesh.add(stepMesh1)
    groupMesh.add(stepMesh2)
    groupMesh.add(wallGroupMesh)

    stepMesh1.rotation.y = rotation * Math.PI / 180
    stepMesh2.rotation.y = rotation * Math.PI / 180
    wallGroupMesh.rotation.y = rotation * Math.PI / 180

    ri.scene.add(groupMesh);

    let rigidBody1 = createAmmoRigidBody(compoundShape1, stepMesh1, 0.1, 0.1, position, mass);
    let rigidBody2 = createAmmoRigidBody(compoundShape2, stepMesh2, 0.1, 0.1, position, mass);
    let wallRigidBody = createAmmoRigidBody(wallCompoundShape, wallGroupMesh, 0.1, 0.1, position, mass);

    // Make object movable:
    rigidBody1.setCollisionFlags(rigidBody1.getCollisionFlags() | 2);  // 2 = BODYFLAG_KINEMATIC_OBJECT: Betyr kinematic object, masse=0 men kan flyttes!
    rigidBody1.setActivationState(4);  // 4 = BODYSTATE_DISABLE_DEACTIVATION, dvs. "Never sleep".
    rigidBody2.setCollisionFlags(rigidBody2.getCollisionFlags() | 2);  // 2 = BODYFLAG_KINEMATIC_OBJECT: Betyr kinematic object, masse=0 men kan flyttes!
    rigidBody2.setActivationState(4);  // 4 = BODYSTATE_DISABLE_DEACTIVATION, dvs. "Never sleep".

    let val = 0.03;
    val = offset
    let duration = 1100;

    function newTween(value, duration, mesh2move) {
        return new TWEEN.Tween({y: 0})
            .to({y: value}, duration)
            .yoyo(true)
            .repeat(1)
            .onUpdate(function (newPosition) {
                // groupMesh.position.y = position.y + newPosition.y
                moveRigidBodyAnimation(mesh2move, position, {x: 0, y: newPosition.y, z: 0})
            })
    }

    // Move steps up
    let tween1 = newTween(val, duration, stepMesh1)
    let tween2 = newTween(val, duration, stepMesh2)
    // Move steps down
    let tween3 = newTween(-val, duration, stepMesh1)
    let tween4 = newTween(-val, duration, stepMesh2)

    tween1.chain(tween2, tween3)
    tween2.chain(tween1, tween4)

    tween1.start()

    // Ball for testing
    let ballPos = {x:position.x, y:position.y +  size.y/2, z:position.z + size.z/2}
    ball(ballPos, 0.4, 10, 0.1)
    rails(ballPos, rotation, -5, 8)
    ballPos.z += 7.5
    ballPos.y += 2
    ball(ballPos, 0.4, 10, 0.1)
    groupMesh.tween = tween1
}
