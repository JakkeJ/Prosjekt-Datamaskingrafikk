import './style.css';
import * as THREE from "three";
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import GUI from 'lil-gui'
import {color} from "three/nodes";

const ri = {
    currentlyPressedKeys: [],
}

let phy = {
    rigidBodies: [],

}


export function main() {
    createThreeScene();
    createAmmoWorld();

    // Clock for animation
    ri.clock = new THREE.Clock();

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keyup', handleKeyUp, false);
    document.addEventListener('keydown', handleKeyDown, false);

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
    ri.camera.position.set( 20, 10, 0 );
    // ri.camera.position.set( 2, 15, -4 ); // Temp position
    ri.camera.lookAt( 0, 0, 0 );
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


function renderCamera() {
    ri.renderer.render(ri.scene, ri.camera)
}


function addToScene() {
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    ri.textures = {};

    ri.textures.johnny = loader.load('static/johnny.png');

    manager.onLoad = () => {
        addLights()

        // Three-Ammo objects:
        threeAmmoObjects()

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

    renderCamera()
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
    ri.directionalLight.position.set(1, 20, 0);
    ri.directionalLight.castShadow = true;

    ri.directionalLight.shadow.mapSize.width = 1024;
    ri.directionalLight.shadow.mapSize.height = 1024;
    ri.directionalLight.shadow.camera.near = 0;
    ri.directionalLight.shadow.camera.far = 50;
    ri.directionalLight.shadow.camera.left = -15;
    ri.directionalLight.shadow.camera.right = 15;
    ri.directionalLight.shadow.camera.top = 15;
    ri.directionalLight.shadow.camera.bottom = -15;

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
function createAmmoRigidBody(shape, threeMesh, restitution=0.7, friction=0.8, position={x:0, y:50, z:0}, mass=1, useLocalScaling=true) {

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

    const ballPosition = {x: 0, y: 20, z: 0};
    const ballRadius = 2
    const ballMass = 10
    ball(ballPosition, ballRadius, ballMass)


    // Kan flyttes hvor som helst, kan ikke roteres
    const dominoPosition = {x: 10, y: 3, z: -10};
    domino(dominoPosition)


}


function ground() {
    const position = {x: 0, y: 0, z: 0};
    const size = {x: 50, y:1, z: 50};

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


function ball(position, radius, mass) {
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

    // AMMO
    let shape = new Ammo.btSphereShape(radius);
    createAmmoRigidBody(shape, mesh, 0.7, 0.8, position, mass);
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


function domino(position) {
    //const tablePosition = {x: 1, y: 3, z: 0};
    const tableSize = {x: 5, y: 0.05, z: 10};
    cube(position, tableSize,0, 'table',0, 0x823c17)

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
        {x: position.x - 1.8, y: position.y + 0.5, z: position.z + 0.6, rot: 30},
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

    dominoPositions.forEach(position => cube(position, dominoSize,position.rot , 'dominoPiece', 4, 0x303030))

    // Ball to start first domino:
    const ballPosition = {x: position.x + 0, y: position.y + 2, z: position.z - 5.3}

    ball(ballPosition, 0.45, 1)

}