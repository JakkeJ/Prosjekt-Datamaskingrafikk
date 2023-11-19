import './style.css';
import * as THREE from "three";
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import GUI from 'lil-gui'
import {color} from "three/nodes";
import {
    createConvexTriangleShapeAddToCompound,
    createTriangleShapeAddToCompound,
    generateTriangleShape
} from "./triangleMeshHelpers.js";

const ri = {
    currentlyPressedKeys: [],
}

let phy = {
    ammoPhysicsWorld: undefined,
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

    const ballPosition = {x: 7, y: 70, z: 0.1};
    const ballRadius = 2
    const ballMass = 10
    ball(ballPosition, ballRadius, ballMass)


    // Kan flyttes hvor som helst, kan ikke roteres
    const dominoPosition = {x: 10, y: 3, z: -10};
    domino(dominoPosition)

    plinko();
    //spring();
    golfclub();
    
    
    // const position = {x: 10, y: 3, z: 10};
    const position = {x: 15, y: 5, z: -10};
    funnel(position)


    createCoffeeCupTriangleMesh(
        20000,
        0x00FF09,
        {x:-10, y:10, z:-10});


}


function ground() {
    const position = {x: 0, y: 0, z: 0};
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


function funnel(position) {
    //Ammo-container:
    let compoundShape = new Ammo.btCompoundShape();

    const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide,
        metalness: 0.5,
        roughness: 0.3});

    let points = [
        new THREE.Vector2(0.5, 0),
        new THREE.Vector2(0.5, 0.3),
        new THREE.Vector2(0.7, 0.4),
        new THREE.Vector2(0.9, 0.5),
        new THREE.Vector2(1.1, 0.6),
        new THREE.Vector2(1.3, 0.7),
        new THREE.Vector2(1.45, 0.8),
        new THREE.Vector2(1.6, 0.9),
        new THREE.Vector2(1.7, 1.0),

        new THREE.Vector2(2.7, 2.0),
    ];

    let geometry = new THREE.LatheGeometry(points, 128, 0, 2 * Math.PI);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'funnel';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // mesh.updateMatrix();
    // mesh.updateMatrixWorld(true);

    ri.scene.add(mesh);


    createTriangleShapeAddToCompound(compoundShape, mesh);

    createAmmoRigidBody(compoundShape, mesh, 0.4, 0.6, position, 0);

    // Ball to test funnel
    const ballPosition = {x: position.x + 0.5, y: position.y + 5, z: position.z + 2}
    ball(ballPosition, 0.45, 1)
}


function domino(position) {
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

    dominoPositions.forEach(position => cube(position, dominoSize,position.rot , 'dominoPiece', 4, 0x303030))

    // Ball to start first domino:
    //const ballPosition = {x: position.x + 0, y: position.y + 5, z: position.z - 5.3}
    //ball(ballPosition, 0.45, 1)
}


function createAmmoMesh(shapeType, geometry, geoValues, meshPosition, meshRotation, texture, parentMesh, parentShape) {
    let shape;
    
    if (shapeType == 'box') {

        shape = new Ammo.btBoxShape(new Ammo.btVector3(geoValues.x/2, geoValues.y/2, geoValues.z/2));

    } else if (shapeType == 'cylinder') {
        shape = new Ammo.btCylinderShape(new Ammo.btVector3(geoValues.x, geoValues.z/2, geoValues.y));
    }

    let mesh = new THREE.Mesh(geometry, texture);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(meshPosition.x, meshPosition.y, meshPosition.z);
    mesh.rotateX(meshRotation.x);
    mesh.rotateY(meshRotation.y);
    mesh.rotateZ(meshRotation.z);

    
    let rotation = new THREE.Quaternion();
    if (meshRotation.x != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), meshRotation.x);}; 
    if (meshRotation.y != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), meshRotation.y);};
    if (meshRotation.z != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), meshRotation.z);};

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(meshPosition.x, meshPosition.y, meshPosition.z));
    transform.setRotation(new Ammo.btQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));

    parentMesh.add(mesh);
    parentShape.addChildShape(transform, shape);

};

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
    };

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
    groupMesh.position.x = 10
    groupMesh.position.y = 25;
    groupMesh.position.z = -15;
    groupMesh.scale.set(0.1,0.1,0.1);
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
    let position = {x: 40, y: 19.01, z: 40};
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
    let piviotStand = new Ammo.btVector3(0, 0, 0);
    let axisStand = new Ammo.btVector3(0, 0, 1);
    let piviotClub = new Ammo.btVector3(0, 9.35, 0);
    let axisClub = new Ammo.btVector3(0, 0, 1);
    let ClubHinge = new Ammo.btHingeConstraint(golfClubStandRigid, golfClubRigid, piviotStand, piviotClub, axisStand, axisClub, false);
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


/*
function spring() {
    //Benyttet kode eksempler utgitt av Werner Farstad. Hentet fra: https://source.coderefinery.org/3d/threejs23_std/-/blob/main/src/modul7/ammoConstraints/springGeneric6DofSpringConstraint.js?ref_type=heads
    let boxValues = {x: 1, y: 1, z: 1};
    let box2Values = {x: 1, y: 1, z: 1};
    let pegGeo = new THREE.CylinderGeometry(box2Values.x, box2Values.y, box2Values.z, 36, 1);
    //createAmmoMesh('cylinder', pegGeo, pegValues, {x: x+j, y: 0.4, z: 5.5+y}, {x: 0, y: 0, z: 0}, materialJohnny, plinkoMesh, plinkoShape);

    const materialJohnny = new THREE.MeshStandardMaterial({map: ri.textures.johnny, side: THREE.DoubleSide});
    const colorGrey = new THREE.MeshStandardMaterial({color: 0xffffff, side: THREE.DoubleSide});

    let boxGeo = new THREE.BoxGeometry(boxValues.x, boxValues.y, boxValues.z);
    let box = createAmmoMesh2('box', boxGeo, boxValues, {x: 0, y: 4, z: 4}, {x: 0, y: 0, z: 0}, materialJohnny);
    let box2Geo = new THREE.BoxGeometry(box2Values.x, box2Values.y, box2Values.z);
    let box2 = createAmmoMesh2('cylinder', box2Geo, box2Values, {x: 0, y: 4, z: 5.5}, {x: 0, y: 0, z: 0}, colorGrey);

    let rigidBox = createAmmoRigidBody(box.shape, box.mesh, 1, 1, box.mesh.position, 0);
    let rigidBox2 = createAmmoRigidBody(box2.shape, box2.mesh, 1, 1, box2.mesh.position, 0.1);

    let spring = new Ammo.btGeneric6DofSpringConstraint(rigidBox, rigidBox2, box.transform, box2.transform, true);

    spring.setLinearLowerLimit(new Ammo.btVector3(0, 0, 0));
    spring.setLinearUpperLimit(new Ammo.btVector3(0, 0, 0));
    spring.setAngularLowerLimit(new Ammo.btVector3(0, 0, 0));
    spring.setAngularUpperLimit(new Ammo.btVector3(0, 0, 0));

    spring.enableSpring(0, false);
    spring.enableSpring(1, false);
    spring.enableSpring(2, false);
    spring.enableSpring(3, false);
    spring.enableSpring(4, false);
    spring.enableSpring(5, false);

    spring.setStiffness(0, 1);
    spring.setStiffness(1, 1);
    spring.setStiffness(2, 1);

    spring.setDamping(0, 1);
    spring.setDamping(1, 1);
    spring.setDamping(2, 1);

    rigidBox.threeMesh = box.mesh;
    rigidBox2.threeMesh = box2.mesh;
    box.mesh.userData.physicsBody = rigidBox
    box2.mesh.userData.physicsBody = rigidBox2

    phy.rigidBodies.push(box.mesh);
    phy.rigidBodies.push(box2.mesh);
    phy.ammoPhysicsWorld.addConstraint(spring, false);
    ri.scene.add(box.mesh);
    ri.scene.add(box2.mesh);

}*/


/*function createAmmoMesh2(shapeType, geometry, geoValues, meshPosition, meshRotation, texture) {
    let shape;
    
    if (shapeType == 'box') {

        shape = new Ammo.btBoxShape(new Ammo.btVector3(geoValues.x/2, geoValues.y/2, geoValues.z/2));

    } else if (shapeType == 'cylinder') {
        shape = new Ammo.btCylinderShape(new Ammo.btVector3(geoValues.x, geoValues.y, geoValues.z/2));
    }

    let mesh = new THREE.Mesh(geometry, texture);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(meshPosition.x, meshPosition.y, meshPosition.z);
    mesh.rotateX(meshRotation.x);
    mesh.rotateY(meshRotation.y);
    mesh.rotateZ(meshRotation.z);

    
    let rotation = new THREE.Quaternion();
    if (meshRotation.x != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), meshRotation.x);}; 
    if (meshRotation.y != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), meshRotation.y);};
    if (meshRotation.z != 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), meshRotation.z);};

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(meshPosition.x, meshPosition.y, meshPosition.z));
    transform.setRotation(new Ammo.btQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));

    return { shape, mesh, transform}

};*/

function createHinge(rigidBody1, rigidBody2) {
    //Benyttet kode eksempler utgitt av Werner Farstad. Hentet fra https://source.coderefinery.org/3d/threejs23_std/-/blob/main/src/modul7/ammoConstraints/armHingeConstraint.js?ref_type=heads
    let piviot1 = new Ammo.btVector3(0, 0, 0);
    let axis1 = new Ammo.btVector3(0, 0, 1);
    let piviot2 = new Ammo.btVector3(0, 9.35, 0);
    let axis2 = new Ammo.btVector3(0, 0, 1);

    let hinge = new Ammo.btHingeConstraint(rigidBody1, rigidBody2, piviot1, piviot2, axis1, axis2, false);
    hinge.setLimit(-Math.PI/2, Math.PI/2, 1, 1, 1);
    hinge.enableAngularMotor(true, 0, 4);
    phy.ammoPhysicsWorld.addConstraint(hinge, true);
}