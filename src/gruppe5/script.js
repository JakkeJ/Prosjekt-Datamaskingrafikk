// noinspection JSPotentiallyInvalidConstructorUsage

import './style.css';
import * as THREE from "three";
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import GUI from 'lil-gui'
import * as TWEEN from '@tweenjs/tween.js'   // HUSK: npm install @tweenjs/tween.js
import {
    createConvexTriangleShapeAddToCompound,
    createTriangleShapeAddToCompound,
    traverseModel
} from "./triangleMeshHelpers.js";
import {degToRad, radToDeg} from "three/src/math/MathUtils.js";
import {createMovable, moveRigidBody} from "./movable.js";

export const ri = {
    currentlyPressedKeys: [],
    springs: {
        cannonSpring: undefined,
    },
    camera: undefined,
    raycaster: undefined,
    mouse: undefined,
    balls: []
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


function createThreeScene() {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    ri.renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
    ri.renderer.setSize(window.innerWidth, window.innerHeight);
    ri.renderer.shadowMap.enabled = true;
    ri.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    ri.scene = new THREE.Scene();
    ri.scene.background = new THREE.Color(0xe4f3f0);

    ri.lilGui = new GUI();

    ri.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    ri.camera.position.set( 25, 10, -0 );
    // ri.camera.position.set( 20, 10, -20 ); // Temp position

    ri.controls = new OrbitControls(ri.camera, ri.renderer.domElement);
}


// Hentet fra kodeeksempel modul7/ammoShapes1
function createAmmoWorld() {
    phy.transform = new Ammo.btTransform();

    // Initialiserer phy.ammoPhysicsWorld:
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    phy.ammoPhysicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    phy.ammoPhysicsWorld.setGravity(new Ammo.btVector3(0, -9.81, 0));
}


function onWindowResize() {
    ri.camera.aspect = window.innerWidth / window.innerHeight;
    ri.camera.updateProjectionMatrix();
    ri.renderer.setSize(window.innerWidth, window.innerHeight);
}

function handleKeyUp(event) {
    ri.currentlyPressedKeys[event.code] = false;
}

function handleKeyDown(event) {
    ri.currentlyPressedKeys[event.code] = true;
}

function keyPresses() {
    if (ri.currentlyPressedKeys['KeyQ']) {
        ri.springs.cannonSpring.enableSpring(1, true);;
    }
    const movableMesh = ri.scene.getObjectByName("movable");
    if (ri.currentlyPressedKeys['KeyA']) {	//A
        moveRigidBody(movableMesh,{x: -0.2, y: 0, z: 0});
    }
    if (ri.currentlyPressedKeys['KeyD']) {	//D
        moveRigidBody(movableMesh,{x: 0.2, y: 0, z: 0});
    }
    if (ri.currentlyPressedKeys['KeyW']) {	//W
        moveRigidBody(movableMesh,{x: 0, y: 0, z: -0.2});
    }
    if (ri.currentlyPressedKeys['KeyS']) {	//S
        moveRigidBody(movableMesh,{x: 0, y: 0, z: 0.2});
    }
}


// Hentet fra kodeeksempel modul9/selectObject1
function onDocumentTouchStart(event) {
    event.preventDefault();
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
    onDocumentMouseDown( event );
}


// Hentet fra kodeeksempel modul9/selectObject1
function onDocumentMouseDown(event) {
    event.preventDefault();
    // Se: https://threejs.org/docs/index.html#api/en/core/Raycaster.
    // ri.mouse.x og y skal være NDC, dvs. ligge i området -1 til 1.   (normalized device coordinates)
    ri.mouse.x = (event.clientX / ri.renderer.domElement.clientWidth) * 2 - 1;
    ri.mouse.y = -(event.clientY / ri.renderer.domElement.clientHeight) * 2 + 1;

    //Ray/stråle fra klikkposisjon til kamera:
    ri.raycaster.setFromCamera(ri.mouse, ri.camera); // Raycaster

    let intersects = ri.raycaster.intersectObjects(ri.balls);

    //Sjekker om strålen treffer noen av objekene:
    if (intersects.length > 0) {
        // console.log('ball')
        //Endrer farge på det første objektet som er klikket på som strålen treffer:
        let ball = intersects[0].object
        ball.material.color.setHex(Math.random() * 0xffffff);

        // Can only click a ball 1 time
        if (ball.name == 'ball'){
            ball.userData.physicsBody.applyCentralImpulse( new Ammo.btVector3(10, 0, 0 ));
            ball.name = 'ball_'
        }

        // //Viser en "partikkel":
        // let particle = new THREE.Sprite(ri.particleMaterial);
        // particle.position.copy(intersects[0].point);
        // particle.scale.x = particle.scale.y = 16;
        // ri.scene.add(particle);
    }
}


function renderCamera() {
    ri.renderer.render(ri.scene, ri.camera);
}


function addToScene() {
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    ri.textures = {};

    ri.textures.johnny = loader.load('static/johnny.png');
    ri.textures.darkGrey = loader.load('static/darkGreyTexture.png')

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
    // console.log('Current time: '+currentTime)

    // Time interval for smooth movement regardless of FPS:
    let delta = ri.clock.getDelta();

    updatePhysics(delta)
    updateLines();
    updateHingeMarkers();
    renderCamera();
    keyPresses();

    TWEEN.update(currentTime);
}


function addLights() {
    ambientLight();
    directionalLight();
}


// Kode hentet fra oblig 3
function ambientLight() {
    ri.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    ri.ambientLight.visible = true;
    ri.scene.add(ri.ambientLight);

    // lilGui
    ri.ambientFolder = ri.lilGui.addFolder( 'Ambient Light' );
    ri.ambientFolder.close();
    ri.ambientFolder.add(ri.ambientLight, 'visible').name("On/Off");
    ri.ambientFolder.add(ri.ambientLight, 'intensity').min(0).max(1).step(0.01).name("Intensity");
    ri.ambientFolder.addColor(ri.ambientLight, 'color').name("Color");
}


// Kode hentet fra oblig 3
function directionalLight() {
    ri.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    ri.directionalLight.position.set(1, 40, 0);
    ri.directionalLight.castShadow = true;

    ri.directionalLight.shadow.mapSize.width = 1024;
    ri.directionalLight.shadow.mapSize.height = 1024;
    ri.directionalLight.shadow.camera.near = 0;
    ri.directionalLight.shadow.camera.far = 50;
    ri.directionalLight.shadow.camera.left = -50;
    ri.directionalLight.shadow.camera.right = 50;
    ri.directionalLight.shadow.camera.top = 50;
    ri.directionalLight.shadow.camera.bottom = -50;

    const directionalLightHelper = new THREE.DirectionalLightHelper(ri.directionalLight, 10, 0xff7777);
    const directionalLightCameraHelper = new THREE.CameraHelper(ri.directionalLight.shadow.camera)
    directionalLightHelper.visible = false;
    directionalLightCameraHelper.visible = false;

    ri.scene.add(ri.directionalLight);
    ri.scene.add(directionalLightHelper);
    ri.scene.add(directionalLightCameraHelper);

    // Add folder to lilGui
    ri.directionalFolder = ri.lilGui.addFolder('Directional Light');
    ri.directionalFolder.close();
    ri.directionalFolder.add(ri.directionalLight, 'visible').name("On/Off");

    ri.directionalFolder.add(directionalLightHelper, 'visible').name("Helper").onChange(value => {
        directionalLightCameraHelper.visible = value;
    });
    ri.directionalFolder.add(ri.directionalLight, 'intensity').min(0).max(1).step(0.01).name("Intensity");
    ri.directionalFolder.addColor(ri.directionalLight, 'color').name("Color");
}


// Hentet fra kodeeksempel modul7/ammoShapes1, modifisert
export function createAmmoRigidBody(shape, threeMesh, restitution=0.7, friction=0.8, position={x:0, y:50, z:0}, mass=1, useLocalScaling=true) {

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

    let quaternion = threeMesh.quaternion;
    transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));

    if (useLocalScaling) {
        let scale = threeMesh.scale;
        shape.setLocalScaling(new Ammo.btVector3(scale.x, scale.y, scale.z));
    }

    let motionState = new Ammo.btDefaultMotionState(transform);
    let localInertia = new Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    let rigidBody = new Ammo.btRigidBody(rbInfo);
    rigidBody.setRestitution(restitution);
    rigidBody.setFriction(friction);

    // All remaining work using rigidBody, no return needed
    threeMesh.userData.physicsBody = rigidBody;
    phy.ammoPhysicsWorld.addRigidBody(rigidBody);  // Add to ammo physics world:

    phy.rigidBodies.push(threeMesh);
    rigidBody.threeMesh = threeMesh;

    return rigidBody;
}


// Hentet fra kodeeksempel modul7/ammoShapes1
function updatePhysics(deltaTime) {
    phy.ammoPhysicsWorld.stepSimulation(deltaTime, 10);
    for (let i = 0; i < phy.rigidBodies.length; i++) {
        let mesh = phy.rigidBodies[i];
        let rigidBody = mesh.userData.physicsBody;
        let motionState = rigidBody.getMotionState();
        if (motionState) {
            motionState.getWorldTransform(phy.transform);
            let p = phy.transform.getOrigin();
            let q = phy.transform.getRotation();
            mesh.position.set(p.x(), p.y(), p.z());
            mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
    }
}


// Kode hentet fra oblig 3
// Vet ikke om vi blir å bruke denne
function createMesh(geometry, material, parent, name = "", translateY = 0, translateZ = 0, rotateX = 0, rotateY = 0, rotateZ = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
    const mesh = new THREE.Mesh(geometry, material);

    mesh.translateY(translateY);
    mesh.translateZ(translateZ);
    mesh.rotateX(rotateX);
    mesh.rotateY(rotateY);
    mesh.rotateZ(rotateZ);
    mesh.scale.set(scaleX, scaleY, scaleZ);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}


function threeAmmoObjects() {
    ground()

    let ballPosition = {x: -10, y: 3.5, z: 10};
    let ballRadius = 0.5
    let ballMass = 10
    ball(ballPosition, ballRadius, ballMass, 0.1, 0.5)


    // Kan flyttes hvor som helst, kan ikke roteres
    let dominoPosition = {x: 10, y: 3, z: -10};
    domino(dominoPosition, 0)

    // dominoPosition = {x: 10, y: 8, z: 10};
    // domino(dominoPosition, 30, true)

    // plinko();
    spring();
    golfclub();
    newtonCradle();
    spiral();
    
    // let position = {x: 10, y: 3, z: 10};
    let position = {x: 15, y: 5, z: -10};
    funnel(position, 2.7, 0.3, 2)

    position.x -= 1
    position.y -= 0.7
    // position = {x: 15, y: 3, z: -10};
    rails(position, 180, 10, 7)


    position.x += 6
    position.y -= 1.5
    // rails(position, 180, -5, 15)

    rails(position, 180, -0, 15)

    position.y += 1
    position.x += 5
    //ball(position, 0.5, 5)

    position.x += 1
    //ball(position, 0.5, 5)

    position.x += 1
    //ball(position, 0.5, 5)

    position.x += 1
    ball(position, 0.5, 5)


    // createCoffeeCupTriangleMesh(
    //     20000,
    //     0x00FF09,
    //     {x:-10, y:10, z:-10});

    // tableTest()
    ballPosition = {x: 10, y: 3, z: 4};
    ballRadius = 0.5
    ballMass = 0
    // ball(ballPosition, ballRadius, ballMass)

    //arrow()
}


function ground() {
    const position = {x: 0, y: -2.5, z: 0};
    const size = {x: 100, y:5, z: 100};

    // THREE
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const texture = ri.textures.johnny;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(100,100);
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide});
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = 'ground';
    // mesh.castShadow = true;
    mesh.receiveShadow = true;

    ri.scene.add(mesh);

    // AMMO
    let shape = new Ammo.btBoxShape(new Ammo.btVector3(size.x/2, size.y/2, size.z/2));
    createAmmoRigidBody(shape, mesh, 0.7, 0.8, position, 0);
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
    mesh.position.set(position.x, position.y, position.z);

    ri.scene.add(mesh);
    ri.balls.push(mesh)

    // AMMO
    let shape = new Ammo.btSphereShape(radius);
    let rigidBody = createAmmoRigidBody(shape, mesh, restitution, friction, position, mass);

    rigidBody.setActivationState(4)
    //mesh.userData.physicsBody
}

function cube(position, size, rotation = 0 , name = 'cube', mass = 0, color = 0xFFFFFF) {
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
    createAmmoRigidBody(shape, mesh, 0.5, 0.8, position, mass);
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

function tableTest() {
    let position = {x: 20, y: 5, z: 4};
    let size = {x: 6, y: 0.3, z: 10};
    let rotation = {x: 0, y: 0, z: 0};

    let groupMesh = new THREE.Group();
    groupMesh.rotateY(degToRad(0));
    let compoundShape = new Ammo.btCompoundShape();

    tableMesh(groupMesh, compoundShape, size, rotation, position.y, 'tableTest',  0x823c17)

    ri.scene.add(groupMesh);

    createAmmoRigidBody(compoundShape, groupMesh, 0.5, 0.5, position, 20);

    // position.y += 15
    // position.x += 0
    // ball(position, 1, 30)
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
    ball(ballPosition, lowerRadius*0.9, 5, 0.05)
}


function rails(position, rotation = 180, tilt = 20, length = 4) {
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

    ri.scene.add(groupMesh);

    createAmmoRigidBody(compoundShape, groupMesh, 0, 0.8, position, 0);
}


function domino(position, rotation = 0, starter = false) {
    const tableSize = {x: 5, y: 0.05, z: 10};
    // let rotation = {x: 0, y: 0, z: 0};
    let groupMesh = new THREE.Group();
    groupMesh.rotateY(degToRad(rotation));
    let compoundShape = new Ammo.btCompoundShape();

    tableMesh(groupMesh, compoundShape, tableSize, {x: 0, y: 0, z: 0}, position.y, 'dominoTable',  0x823c17)

    ri.scene.add(groupMesh);

    createAmmoRigidBody(compoundShape, groupMesh, 0.5, 0.5, position, 0);

    // cube(position, tableSize, rotation, 'table',0, 0x823c17)

    const dominoSize = {x: 0.4, y: 0.8, z: 0.08};
    const dominoPositions = [
        {x: position.x + 0, y: position.y + 0.5, z: position.z - 4.9, rot: 0},
        {x: position.x + 0, y: position.y + 0.5, z: position.z - 4.2, rot: -10},
        {x: position.x - 0.2, y: position.y + 0.5, z: position.z - 3.7, rot: -20},
        {x: position.x - 0.5, y: position.y + 0.5, z: position.z - 3.3, rot: -40},
        {x: position.x - 1.0, y: position.y + 0.5, z: position.z - 2.9, rot: -40},
        {x: position.x - 1.4, y: position.y + 0.5, z: position.z - 2.4, rot: -35},
        {x: position.x - 1.8, y: position.y + 0.5, z: position.z - 1.9, rot: -25},
        {x: position.x - 2.0, y: position.y + 0.5, z: position.z - 1.4, rot: -10},
        {x: position.x - 2.1, y: position.y + 0.5, z: position.z - 0.7, rot: 0},
        {x: position.x - 2.1, y: position.y + 0.5, z: position.z + 0.0, rot: 10},
        {x: position.x - 1.85, y: position.y + 0.5, z: position.z + 0.55, rot: 30},
        {x: position.x - 1.5, y: position.y + 0.5, z: position.z + 1.0, rot: 70},
        {x: position.x - 0.9, y: position.y + 0.5, z: position.z + 1.1, rot: 90},
        {x: position.x - 0.1, y: position.y + 0.5, z: position.z + 1.1, rot: 90},
        {x: position.x + 0.4, y: position.y + 0.5, z: position.z + 1.0, rot: 110},
        {x: position.x + 0.9, y: position.y + 0.5, z: position.z + 0.8, rot: 130},
        {x: position.x + 1.3, y: position.y + 0.5, z: position.z + 0.3, rot: 145},
        {x: position.x + 1.6, y: position.y + 0.5, z: position.z - 0.3, rot: 160},
        {x: position.x + 1.7, y: position.y + 0.5, z: position.z - 0.8, rot: 180},
        {x: position.x + 1.6, y: position.y + 0.5, z: position.z - 1.2, rot: 200},
        {x: position.x + 1.3, y: position.y + 0.5, z: position.z - 1.5, rot: 240},
        {x: position.x + 0.9, y: position.y + 0.5, z: position.z - 1.7, rot: 260},
        {x: position.x + 0.4, y: position.y + 0.5, z: position.z - 1.8, rot: 280},
        {x: position.x + 0.0, y: position.y + 0.5, z: position.z - 1.6, rot: 320},
        {x: position.x - 0.3, y: position.y + 0.5, z: position.z - 1.0, rot: 335},
        {x: position.x - 0.4, y: position.y + 0.5, z: position.z - 0.4, rot: 350},
        {x: position.x - 0.5, y: position.y + 0.5, z: position.z + 0.1, rot: 0},
        {x: position.x - 0.5, y: position.y + 0.5, z: position.z + 0.7, rot: 0},
        {x: position.x - 0.5, y: position.y + 0.5, z: position.z + 1.5, rot: 0},
        {x: position.x - 0.5, y: position.y + 0.5, z: position.z + 2.1, rot: 10},
        {x: position.x - 0.4, y: position.y + 0.5, z: position.z + 2.7, rot: 10},
        {x: position.x - 0.2, y: position.y + 0.5, z: position.z + 3.3, rot: 15},
        {x: position.x - 0.1, y: position.y + 0.5, z: position.z + 3.8, rot: 10},
        {x: position.x + 0.0, y: position.y + 0.5, z: position.z + 4.4, rot: 5},
        {x: position.x + 0, y: position.y + 0.5, z: position.z + 4.9, rot: 0},
    ]

    dominoPositions.forEach(position => cube(position, dominoSize, position.rot , 'dominoPiece', 20, 0x303030))

    // Ball to start first domino:
    if (starter){
        const ballPosition = {x: position.x + 0, y: position.y + 3, z: position.z - 5.3}
        ball(ballPosition, 0.45, 10)
    }

}

function createAmmoMesh(shapeType, geometry, size, meshPosition, meshRotation, texture, groupMesh, compoundShape, name = "") {
    let shape;
    
    if (shapeType == 'box') {
        shape = new Ammo.btBoxShape(new Ammo.btVector3(size.x/2, size.y/2, size.z/2));
        
    } else if (shapeType == 'cylinder') {
        if (size.radius1){
            shape = new Ammo.btCylinderShape(new Ammo.btVector3(size.radius1, size.height/2, size.radius2));
        }
        else{
            shape = new Ammo.btCylinderShape(new Ammo.btVector3(size.x, size.z/2, size.y));
        }

    } else if (shapeType == 'sphere') {
        shape = new Ammo.btSphereShape(size.radius);
    }

    let mesh = new THREE.Mesh(geometry, texture);
    mesh.name = name
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(meshPosition.x, meshPosition.y, meshPosition.z);
    mesh.rotateX(meshRotation.x);
    mesh.rotateY(meshRotation.y);
    mesh.rotateZ(meshRotation.z);
    
    let rotation = new THREE.Quaternion();
    if (meshRotation.x != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), meshRotation.x)}
    if (meshRotation.y != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), meshRotation.y)}
    if (meshRotation.z != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), meshRotation.z)}

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(meshPosition.x, meshPosition.y, meshPosition.z));
    transform.setRotation(new Ammo.btQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));

    groupMesh.add(mesh);
    compoundShape.addChildShape(transform, shape);

    return {
        mesh,
        transform,
        shape
    }
}

function plinko() {

    let boardValues = {x: 20, y: 0.2, z: 12};
    let pegValues = {x: 0.08, y: 0.04, z: 0.5};
    let fenceValues = {x: 0.2, y: 0.8, z: 13};
    let rampValues = {x: 0.2, y: 0.8, z: 20};
    let topFrameValues = {x: 20.01, y: 0.8, z: 0.2};
    let sideFrameValues = {x: 0.8, y: 0.4, z: 9.28};
    let backFrameValues = {x: 0.8, y: 8.5, z: 0.8};
    let frontBottomFrameValues = {x: 20.01, y: 0.4, z: 0.2};

    const materialJohnny = new THREE.MeshStandardMaterial({map: ri.textures.johnny, side: THREE.DoubleSide});
    const colorGrey = new THREE.MeshStandardMaterial({color: 0xffffff, side: THREE.DoubleSide});
    let plinkoMesh = new THREE.Group();
    plinkoMesh.position.set(14, 7.05, -30.5);
    plinkoMesh.rotateY(90*Math.PI/180); 
    plinkoMesh.rotateX(-45*Math.PI/180); 
    let plinkoShape = new Ammo.btCompoundShape();

    let boardGeo = new THREE.BoxGeometry(boardValues.x, boardValues.y, boardValues.z);
    let plinkoBoard = createAmmoMesh('box', boardGeo, boardValues, {x:-5, y: 0, z:0}, {x: 0, y: 0, z: 0}, colorGrey, plinkoMesh, plinkoShape);
    
    let fenceGeo = new THREE.BoxGeometry(fenceValues.x, fenceValues.y, fenceValues.z);
    let fence = createAmmoMesh('box', fenceGeo, fenceValues, {x:0.2, y: 0.4, z: 1.2}, {x: 0, y: -45*Math.PI/180, z: 0}, materialJohnny, plinkoMesh, plinkoShape);
    let secondFence = createAmmoMesh('box', fenceGeo, fenceValues, {x:-10.2, y: 0.4, z: 1.2}, {x: 0, y: 45*Math.PI/180, z: 0}, materialJohnny, plinkoMesh, plinkoShape);

    let rampGeo = new THREE.BoxGeometry(rampValues.x, rampValues.y, rampValues.z);
    let ramp = createAmmoMesh('box', rampGeo, rampValues, {x:-5.05, y: 0.4, z: -4.65}, {x: 0, y: 83*Math.PI/180, z: 0}, materialJohnny, plinkoMesh, plinkoShape);

    let topFrameGeo = new THREE.BoxGeometry(topFrameValues.x, topFrameValues.y, topFrameValues.z);
    let topFrame = createAmmoMesh('box', topFrameGeo, topFrameValues, {x: -5, y: -0.24, z: 6.206}, {x: -45*Math.PI/180, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);

    let frontBottomFrameGeo = new THREE.BoxGeometry(frontBottomFrameValues.x, frontBottomFrameValues.y, frontBottomFrameValues.z);
    let bottomFrontFrame = createAmmoMesh('box', frontBottomFrameGeo, frontBottomFrameValues, {x: -5, y: -0.075, z: -6.075}, {x: -135*Math.PI/180, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);

    let bottomFrameGeo = new THREE.BoxGeometry(sideFrameValues.x, sideFrameValues.y, sideFrameValues.z);
    let bottomLeftFrame = createAmmoMesh('box', bottomFrameGeo, sideFrameValues, {x: 4.602, y: -3.3, z: -2.85}, {x: 45*Math.PI/180, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);
    let bottomRightFrame = createAmmoMesh('box', bottomFrameGeo, sideFrameValues, {x: -14.602, y: -3.3, z: -2.85}, {x: 45*Math.PI/180, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);
    
    let backFrameGeo = new THREE.BoxGeometry(backFrameValues.x, backFrameValues.y, backFrameValues.z);
    let backLeftFrame = createAmmoMesh('box', backFrameGeo, sideFrameValues, {x: 4.602, y: -3.2, z: 3.245}, {x: 45*Math.PI/180, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);
    let backRightFrame = createAmmoMesh('box', backFrameGeo, sideFrameValues, {x: -14.602, y: -3.2, z: 3.245}, {x: 45*Math.PI/180, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);

    let pegGeo = new THREE.CylinderGeometry(pegValues.x, pegValues.y, pegValues.z, 36, 1);

    let x = -5;
    let y = 0;
    let count = 1;
    for (let i = 0; i < 18; i++){
        for (let j = 0; j < count; j++) {
            let peg = createAmmoMesh('cylinder', pegGeo, pegValues, {x: x+j, y: 0.4, z: 5.5+y}, {x: 0, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);
            
        }
        count +=1
        x += -0.5;
        y += -0.5;
    }

    createAmmoRigidBody(plinkoShape, plinkoMesh, 1, 1, plinkoMesh.position, 0);
    
    ri.scene.add(plinkoMesh);

    const ballPosition = {x: 18.8, y: 11.5, z: -25.5}; //x: 17, y: 12, z: -27 
    ball(ballPosition, 0.2, 5)

    const ballPosition2 = {x: 18.9, y: 20, z: -25.5}; //x: 19, y: 20, z: -26
    ball(ballPosition2, 0.20, 3)

}

// testing. Hentet fra eksempel
function createCoffeeCupTriangleMesh(
    mass = 100,
    color=0x00FF09,
    position={x:-20, y:50, z:20},
    ) {
    //Ammo-container:
    let compoundShape = new Ammo.btCompoundShape();
    //Three-container:
    let groupMesh = new THREE.Group();
    groupMesh.userData.tag = 'cup';
    // groupMesh.position.x = 10
    // groupMesh.position.y = 25;
    // groupMesh.position.z = -15;
    groupMesh.scale.set(0.1,0.1,0.1);
    // groupMesh.rotateX(100 * Math.PI/180)
    createCupParts(groupMesh, compoundShape);

    ri.scene.add(groupMesh);

    // Sett samme transformasjon på compoundShape som på bottomMesh:
    createAmmoRigidBody(compoundShape, groupMesh, 0.4, 0.6, position, mass);

}

// testing. Hentet fra eksempel
function createCupParts(groupMesh, compoundShape) {

    let cupMaterial = new THREE.MeshPhongMaterial({color :0xFFFFFF , side: THREE.DoubleSide});	//NB! MeshPhongMaterial

    // Bunnen/sylinder:
    let bottomGeometry = new THREE.CylinderGeometry( 8, 8, 1, 32 );
    let bottomMesh = new THREE.Mesh( bottomGeometry, cupMaterial );
    bottomMesh.castShadow = true;
    bottomMesh.receiveShadow = true;

    groupMesh.add( bottomMesh );
    createConvexTriangleShapeAddToCompound(compoundShape, bottomMesh);

    // Hanken/Torus:
    let torusGeometry = new THREE.TorusGeometry( 9.2, 2, 16, 100, Math.PI );
    let torusMesh = new THREE.Mesh( torusGeometry, cupMaterial );
    torusMesh.rotation.z = -Math.PI/2 - Math.PI/14;
    torusMesh.position.x = 15.8;
    torusMesh.position.y = 15;
    torusMesh.castShadow = true;
    torusMesh.receiveShadow = true;
    groupMesh.add( torusMesh );
    createConvexTriangleShapeAddToCompound(compoundShape, torusMesh);

    //Koppen/Lathe:
    let points = [];
    for (let x = 0; x < 1; x=x+0.1) {
        let y = Math.pow(x,5)*2;
        points.push(new THREE.Vector2(x*20,y*13));
    }
    let latheGeometry = new THREE.LatheGeometry(points, 128, 0, 2 * Math.PI);

    let latheMesh = new THREE.Mesh(latheGeometry, cupMaterial);
    latheMesh.castShadow = true;
    latheMesh.receiveShadow = true;
    // latheMesh.updateMatrix();
    // latheMesh.updateMatrixWorld(true);
    groupMesh.add( latheMesh );
    createConvexTriangleShapeAddToCompound(compoundShape, latheMesh);

    // Kaffen, sylinder:
    let coffeeGeometry = new THREE.CylinderGeometry( 18, 18, 0.2, 32 );
    let coffeeMaterial = new THREE.MeshPhongMaterial({color:0x7F4600});
    let coffeeMesh = new THREE.Mesh( coffeeGeometry, coffeeMaterial );
    coffeeMesh.position.x = 0;
    coffeeMesh.position.y = 24;
    coffeeMesh.position.z = 0;
    groupMesh.add( coffeeMesh );
    createConvexTriangleShapeAddToCompound(compoundShape, coffeeMesh);
}

function golfclub() {
    let position = {x: 40, y: 16.51, z: 40};
    let handleBarValues = {x: 0.2, y: 0.1, z: 4};
    let shaftValues = {x: 0.1, y: 0.1, z: 10};
    let connectorValues = {x: 0.15, y: 0.15, z: 0.4};
    let clubValues = {x: 0.3, y: 0.5, z: 1.5};
    
    const materialJohnny = new THREE.MeshStandardMaterial({map: ri.textures.johnny, side: THREE.DoubleSide});
    const colorGrey = new THREE.MeshStandardMaterial({color: 0xffffff, side: THREE.DoubleSide});

    let golfClubMesh = new THREE.Group();
    golfClubMesh.position.set( position.x, position.y, position.z);
    golfClubMesh.rotateZ(145*Math.PI/180); 
    let golfClubShape = new Ammo.btCompoundShape();

    let handleBarGeo = new THREE.CylinderGeometry(handleBarValues.x, handleBarValues.y, handleBarValues.z, 36, 1);
    let handleBar = createAmmoMesh('cylinder', handleBarGeo, handleBarValues, {x: 0, y: 7, z: 0}, {x: 0, y: 0, z: 0}, materialJohnny, golfClubMesh, golfClubShape);
    let shaftGeo = new THREE.CylinderGeometry(shaftValues.x, shaftValues.y, shaftValues.z, 36, 1);
    let shaft = createAmmoMesh('cylinder', shaftGeo, handleBarValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, colorGrey, golfClubMesh, golfClubShape);
    let connectorGeo = new THREE.CylinderGeometry(connectorValues.x, connectorValues.y, connectorValues.z, 36, 1);
    let connector = createAmmoMesh('cylinder', connectorGeo, connectorValues, {x: 0, y: -5, z: 0}, {x: 0, y: 0, z: 0}, materialJohnny, golfClubMesh, golfClubShape);
    let clubGeo = new THREE.BoxGeometry(clubValues.x, clubValues.y, clubValues.z);
    let club = createAmmoMesh('box', clubGeo, clubValues, {x: 0, y: -5.4, z: 0.6}, {x: 0, y: 0, z: 0}, colorGrey, golfClubMesh, golfClubShape);
    
    let golfClubRigid = createAmmoRigidBody(golfClubShape, golfClubMesh, 0, 0, golfClubMesh.position, 8);


    let golfClubStandMesh = new THREE.Group();
    golfClubStandMesh.position.set( position.x, position.y, position.z);
    let golfClubStandShape = new Ammo.btCompoundShape();
    
    let hingeValues = {x: 0.4, y: 0.4, z: 8};
    let LegValues = {x: 1.4, y: 17, z: 1.4};
    let topBarValues = {x: 0.4, y: 0.4, z: 6};
    let stopperHingeValues = {x: 0.1, y: 0.1, z: 1};

    let hingeGeo = new THREE.CylinderGeometry(hingeValues.x, hingeValues.y, hingeValues.z, 36, 1);
    let hinge = createAmmoMesh('cylinder', hingeGeo, hingeValues, {x: 0, y: 0, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, colorGrey, golfClubStandMesh, golfClubStandShape);
    let leftLegGeo = new THREE.BoxGeometry(LegValues.x, LegValues.y, LegValues.z);
    let leftLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 0, y: -8, z: -4}, {x: 0, y: 0, z: 0}, materialJohnny, golfClubStandMesh, golfClubStandShape);
    let rightLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 0, y: -8, z: 4}, {x: 0, y: 0, z: 0}, materialJohnny, golfClubStandMesh, golfClubStandShape);
    let backLeftLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 6, y: -8, z: -4}, {x: 0, y: 0, z: 0}, materialJohnny, golfClubStandMesh, golfClubStandShape);
    let backRightLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 6, y: -8, z: 4}, {x: 0, y: 0, z: 0}, materialJohnny, golfClubStandMesh, golfClubStandShape);
    let topBarGeo = new THREE.CylinderGeometry(topBarValues.x, topBarValues.y, topBarValues.z, 36, 1);
    let topLeftBar = createAmmoMesh('cylinder', topBarGeo, topBarValues, {x: 2.5, y: 0, z: -4}, {x: 0, y: 0, z: 90*Math.PI/180}, colorGrey, golfClubStandMesh, golfClubStandShape);
    let topRightBar = createAmmoMesh('cylinder', topBarGeo, topBarValues, {x: 2.5, y: 0, z: 4}, {x: 0, y: 0, z: 90*Math.PI/180}, colorGrey, golfClubStandMesh, golfClubStandShape);
    let stopperHingeGeo = new THREE.CylinderGeometry(stopperHingeValues.x, stopperHingeValues.y, stopperHingeValues.z, 36, 1);
    let stopperLeftHinge = createAmmoMesh('cylinder', stopperHingeGeo, stopperHingeValues, {x: 7, y: -7.5, z: -4}, {x: 0, y: 0, z: 90*Math.PI/180}, colorGrey, golfClubStandMesh, golfClubStandShape);
    let stopperRightHinge = createAmmoMesh('cylinder', stopperHingeGeo, stopperHingeValues, {x: 7, y: -7.5, z: 4}, {x: 0, y: 0, z: 90*Math.PI/180}, colorGrey, golfClubStandMesh, golfClubStandShape);

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
    let stopper = createAmmoMesh('cylinder', stopperGeo, stopperValues, {x: 0, y: 0, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, colorGrey, golfClubStopperMesh, golfClubStopperShape);
    let golfClubStopperRigid = createAmmoRigidBody(golfClubStopperShape, golfClubStopperMesh, 0, 0, golfClubStopperMesh.position, 5);
    
    
    ri.scene.add(golfClubStopperMesh);
    ri.scene.add(golfClubStandMesh);
    ri.scene.add(golfClubMesh);
}

function spring() {
    //Benyttet kode eksempler utgitt av Werner Farstad. Hentet fra: https://source.coderefinery.org/3d/threejs23_std/-/blob/main/src/modul7/ammoConstraints/springGeneric6DofSpringConstraint.js?ref_type=heads
    let position = {x: 0, y: 10, z: 10};
    let rotationDegree = 90*Math.PI/180;
    let bottomSpringValues = {x: 1, y: 1, z: 0.2};
    let topSpringValues = {x: 1, y: 1, z: 0.2};
    //createAmmoMesh('cylinder', pegGeo, pegValues, {x: x+j, y: 0.4, z: 5.5+y}, {x: 0, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);

    const materialJohnny = new THREE.MeshStandardMaterial({map: ri.textures.johnny, side: THREE.DoubleSide});
    const colorGrey = new THREE.MeshStandardMaterial({color: 0xffffff, side: THREE.DoubleSide});

    let bottomSpringMesh = new THREE.Group();
    bottomSpringMesh.position.set(position.x, position.y ,position.z);
    bottomSpringMesh.rotateX(rotationDegree)
    let bottomSpringShape = new Ammo.btCompoundShape();
    
    let bottomSpringGeo = new THREE.CylinderGeometry(bottomSpringValues.x, bottomSpringValues.y, bottomSpringValues.z, 36, 1);
    let bottomSpring = createAmmoMesh('cylinder', bottomSpringGeo, bottomSpringValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, materialJohnny, bottomSpringMesh, bottomSpringShape);

    let topSpringMesh = new THREE.Group();
    topSpringMesh.position.set(position.x, position.y+0.1 ,position.z);
    topSpringMesh.rotateX(rotationDegree)
    let topSpringShape = new Ammo.btCompoundShape();
    let topSpringGeo = new THREE.CylinderGeometry(topSpringValues.x, topSpringValues.y, topSpringValues.z, 36, 1);
    let topSpring2 = createAmmoMesh('cylinder', topSpringGeo, topSpringValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, colorGrey, topSpringMesh, topSpringShape);

    let rigidTopSpring = createAmmoRigidBody(bottomSpringShape, bottomSpringMesh, 1, 1, bottomSpringMesh.position, 0);
    let rigidBottomSpring = createAmmoRigidBody(topSpringShape, topSpringMesh, 1, 1, topSpringMesh.position, 10);
    rigidTopSpring.setActivationState(4);
    rigidBottomSpring.setActivationState(4);
    
    let spring = new Ammo.btGeneric6DofSpringConstraint(rigidTopSpring, rigidBottomSpring, bottomSpring.transform, topSpring2.transform, true);
    spring.name = "cannonSpring";

    spring.setLinearLowerLimit(new Ammo.btVector3(0, 1, 0));
    spring.setLinearUpperLimit(new Ammo.btVector3(0, 0, 0));
    spring.setAngularLowerLimit(new Ammo.btVector3(0, 0, 0));
    spring.setAngularUpperLimit(new Ammo.btVector3(0, 0, 0));

    spring.enableSpring(1, false);
    spring.setStiffness(1, 18000);
    spring.setDamping(1, 10);
    spring.setEquilibriumPoint(1, 4);
    
    phy.ammoPhysicsWorld.addConstraint(spring, false);
    ri.springs.cannonSpring = spring;

    //cannonbody
    let cannonBodyShape = new Ammo.btCompoundShape();

    let material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide,
        metalness: 0.4,
        roughness: 0.3});

    
    let height = 10;
    let radius = 1.5;
    let points = [
        new THREE.Vector2(radius*0.9, 0),
        new THREE.Vector2(radius, height*0.1),
        new THREE.Vector2(radius, height*0.3),
        new THREE.Vector2(radius*0.8, height*0.5),
        new THREE.Vector2(radius*0.8, height*0.6),
        new THREE.Vector2(radius*0.8, height*0.8),
        new THREE.Vector2(radius*0.9, height*0.8),
        new THREE.Vector2(radius*0.9, height*0.9),
        new THREE.Vector2(radius*0.4, height*0.9),
    ];

    let cannonBodyGeo = new THREE.LatheGeometry(points, 128, 0, 2 * Math.PI);

    let cannonBodyMesh = new THREE.Mesh(cannonBodyGeo, material);
    cannonBodyMesh.name = 'cannonBody';
    cannonBodyMesh.castShadow = true;
    cannonBodyMesh.receiveShadow = true;

    cannonBodyMesh.material.transparent = true;
    cannonBodyMesh.material.opacity = 1;

    let rotation = new THREE.Quaternion();
    rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationDegree)
    
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(0, 0, 0));
    transform.setRotation(new Ammo.btQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));

    createTriangleShapeAddToCompound(cannonBodyShape, cannonBodyMesh);

    createAmmoRigidBody(cannonBodyShape, cannonBodyMesh, 0.4, 0.6, {x: 0, y: 0, z: 0}, 0);

    bottomSpringMesh.add(cannonBodyMesh);
    bottomSpringShape.addChildShape(transform, cannonBodyShape);

    //cannonEnd
    let cannonEndValues = {radius: 1.35, segments: 32}
    let cannonEndGeo = new THREE.SphereGeometry(cannonEndValues.radius, cannonEndValues.segments, cannonEndValues.segments, 0 , Math.PI);
    let cannonEnd = createAmmoMesh('sphere', cannonEndGeo, cannonEndValues, {x: 0, y: 0, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, material, bottomSpringMesh, bottomSpringShape);

    ri.scene.add(bottomSpringMesh);
    ri.scene.add(topSpringMesh);

    let ballPosition = {x: position.x, y: 15, z: position.z+1};
    let ballRadius = 0.5
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
    let anchorShape = new Ammo.btCompoundShape()
    let anchorSize = {x: 0.1, y: 0.1, z: 0.1};
    let anchorGeo = new THREE.BoxGeometry(anchorSize.x,anchorSize.y,anchorSize.z);
    let ballGeo = new THREE.SphereGeometry(ballValues.radius, ballValues.segments, ballValues.segments);
    let ballPosition = ballValues.radius * 7;
    for (let i = 1; i <= 8; ++i) {
        let anchor1Mesh = new THREE.Group();
        anchor1Mesh.name = "anchor1Mesh" + i;
        let anchor1 = createAmmoMesh('box', anchorGeo, anchorSize, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, anchor1Mesh, anchorShape);
        let anchor1Body = createAmmoRigidBody(anchorShape, anchor1Mesh, 0, 1, {x: -1, y: 4-0.125, z: ballPosition}, 0);
        ri.scene.add(anchor1Mesh);

        let anchor2Mesh = new THREE.Group();
        anchor2Mesh.name = "anchor2Mesh" + i;
        let anchor2 = createAmmoMesh('box', anchorGeo, anchorSize, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, anchor2Mesh, anchorShape);
        let anchor2Body = createAmmoRigidBody(anchorShape, anchor2Mesh, 0, 1, {x: 1, y: 4-0.125, z: ballPosition}, 0);
        ri.scene.add(anchor2Mesh);

        let ballMesh = new THREE.Group();
        ballMesh.name = "ball" + i + "Mesh";
        let ball = createAmmoMesh('sphere', ballGeo, ballValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, ballMesh, ballShape);
        let ballBody;
        if (i === 8) {
            ballBody = createAmmoRigidBody(ballShape, ballMesh, 0.75,1.0, {x: 0, y: 1 - 0.125, z: ballPosition}, 1000);
        } else {
            ballBody = createAmmoRigidBody(ballShape, ballMesh, 0.75,1.0, {x: 0, y: 1 - 0.125, z: ballPosition}, 1000);
        }
        ballBody.threeMesh = ballMesh;
        ri.scene.add(ballMesh);

        let anchorPivot = new Ammo.btVector3(1, 0, 0);
        let ballPivot = new Ammo.btVector3(0, 3, 0);

        let axis = new Ammo.btVector3(1, 0, 0);
        let hinge = new Ammo.btHingeConstraint(anchor1Body, ballBody, anchorPivot, ballPivot, axis, axis, false);
        hinge.setLimit(-Math.PI/2, Math.PI/2, 0.9, 0.3, 1);
        hinge.enableAngularMotor(false, 0, 0);
        phy.ammoPhysicsWorld.addConstraint(hinge, true);

        addLineBetweenObjects("anchor1Mesh" + i, "cradleMesh", {x: 0, y: 0, z: ballPosition}, {x: 0, y: 0, z: ballPosition}, cradleTopBar1.mesh.name, "lineToTopBar1_" + i);
        addLineBetweenObjects("anchor2Mesh" + i, "cradleMesh", {x: 0, y: 0, z: ballPosition}, {x: 0, y: 0, z: ballPosition}, cradleTopBar2.mesh.name, "lineToTopBar2_" + i);

        let anchorWorldPivot = localToWorld(anchor1Body, anchorPivot);
        let ballWorldPivot = localToWorld(ballBody, ballPivot);

        let anchorPivotMarker = createPivotMarker(anchorWorldPivot, 0x00ffff);
        let ballPivotMarker = createPivotMarker(ballWorldPivot);

        anchorPivotMarker.name = "anchorMarker_" + i;
        ballPivotMarker.name = "ballMarker_" + i;

        ri.scene.add(anchorPivotMarker);
        ri.scene.add(ballPivotMarker);

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

//Helper for hinge
function createPivotMarker(position, color = 0xff0000) {
    let geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32, 32);
    let material = new THREE.MeshBasicMaterial({ color: color });
    let marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.rotateZ(Math.PI / 2);
    return marker;
}

function localToWorld(body, localPoint) {
    let worldTransform = body.getWorldTransform();
    let position = worldTransform.getOrigin();
    let orientation = worldTransform.getRotation();

    let localVec = new THREE.Vector3(localPoint.x(), localPoint.y(), localPoint.z());
    let quaternion = new THREE.Quaternion(orientation.x(), orientation.y(), orientation.z(), orientation.w());
    localVec.applyQuaternion(quaternion);

    localVec.add(new THREE.Vector3(position.x(), position.y(), position.z()));
    return localVec;
}

//Werner sin funksjon en gang i tida...
function addLineBetweenObjects(nameMeshStart, nameMeshEnd, meshPositionStart, meshPositionEnd, childName, lineName) {
    ri.scene.updateMatrixWorld(true);
    let lineMeshStartPosition = ri.scene.getObjectByName(nameMeshStart);
    let lineMeshEndPosition = ri.scene.getObjectByName(nameMeshEnd).getObjectByName(childName);

    // Wire / Line:
    // Definerer Line-meshet (beståemde av to punkter):
    const lineMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 30 } );
    const points = [];
    // Finner start- og endepunktmesh:
    const startPoint = new THREE.Vector3();
    const endPoint = new THREE.Vector3();
    // NB! Bruker world-position:
    lineMeshStartPosition.getWorldPosition(startPoint);

    startPoint.set(startPoint.x, meshPositionEnd.y, meshPositionEnd.z);

    lineMeshEndPosition.getWorldPosition(endPoint);
    endPoint.set(endPoint.x, endPoint.y, meshPositionStart.z);

    points.push(startPoint);
    points.push(endPoint);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
    const springLineMesh = new THREE.Line( lineGeometry, lineMaterial );
    springLineMesh.name = lineName;
    // NB! Linemeshet legges til scene-objektet.
    ri.scene.add(springLineMesh);
}

function updateLines() {
    for (let i = 1; i <= 8; ++i) {
        let ballMesh = ri.scene.getObjectByName("ball" + i + "Mesh");
        if (ballMesh && ballMesh.userData.physicsBody) {
            let ballPhysicsBody = ballMesh.userData.physicsBody;
            let ballMotionState = ballPhysicsBody.getMotionState();

            if (ballMotionState) {
                let ballTransform = new Ammo.btTransform();
                ballMotionState.getWorldTransform(ballTransform);
                let ballPosition = ballTransform.getOrigin();

                // Update the line connected to this ball
                let line1 = ri.scene.getObjectByName("lineToTopBar1_" + i);
                let line2 = ri.scene.getObjectByName("lineToTopBar2_" + i);
                if (line1) {
                    let points = line1.geometry.attributes.position.array;
                    points[0] = ballPosition.x();
                    points[1] = ballPosition.y();
                    points[2] = ballPosition.z();
                    line1.geometry.attributes.position.needsUpdate = true;
                }
                if (line2) {
                    let points = line2.geometry.attributes.position.array;
                    points[0] = ballPosition.x();
                    points[1] = ballPosition.y();
                    points[2] = ballPosition.z();
                    line2.geometry.attributes.position.needsUpdate = true;
                }

                Ammo.destroy(ballTransform);
            }
        }
    }
}

function updateHingeMarkers() {
    for (let i = 1; i <= 8; ++i) {
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


function arrow(position = {x:0, y:10, z:0}) {
    // THREE
    let groupMesh = new THREE.Group();

    let width = 2;
    let height = 4;
    let depth = 0.3;

    let shape = new THREE.Shape();
    shape.moveTo( 0,0 );
    shape.lineTo(width/2, height/3);
    shape.lineTo(width/4, height/3);
    shape.lineTo(width/4, height);
    shape.lineTo(-width/4, height);
    shape.lineTo(-width/4, height/3);
    shape.lineTo(-width/2, height/3);

    const extrudeSettings = {
        depth: depth,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelOffset: 0.3,
        bevelSegments: 4
    };

    let geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
    let material = new THREE.MeshStandardMaterial({
        color: 0xd10000,
        metalness: 0.5,
        roughness: 0.3});
    let mesh = new THREE.Mesh(geometry, material);

    groupMesh.name = 'arrow';
    groupMesh.castShadow = true;
    groupMesh.receiveShadow = true;
    groupMesh.position.set(position.x, position.y, position.z);
    mesh.position.set(0, 0, -depth/2)
    groupMesh.add(mesh)

    ri.scene.add(groupMesh);

    let tween1 = new TWEEN.Tween({y: 0})
        .to({y: 3}, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .yoyo(true)
        .repeat(Infinity)
        .onUpdate(function (newPosition) {
            groupMesh.position.y = position.y + newPosition.y
        });

    let tween2 = new TWEEN.Tween({r:0})
        .to({r: 2 * Math.PI}, 6000)
        .repeat(Infinity)
        .onUpdate(function (newPosition) {
            groupMesh.rotation.set(0, newPosition.r, 0)
        });

    tween1.start();
    tween2.start();
}


function spiral() {
    const numTurns = 50;
    const height = numTurns/10;
    const boxSize = 0.05; // Size of each box
    const radius = 0.5;    // Radius of the spiral
    let spiralMesh = new THREE.Group();

    for (let i = 0; i < numTurns * 20; i++) {
        const angle = (i / 200) * Math.PI * 2; // Full circle for each turn
        const x = radius * Math.cos(angle);
        const y = (height / (numTurns * 20)) * i;
        const z = radius * Math.sin(angle);

        const boxGeometry = new THREE.BoxGeometry(boxSize*10, boxSize, boxSize);
        const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);

        box.position.set(x, y, z);

        const radialVector = new THREE.Vector3(x, 0, z);
        radialVector.normalize();

        box.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), radialVector);

        spiralMesh.add(box);
    }
    ri.scene.add(spiralMesh);
}

