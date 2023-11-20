import * as THREE from "three";
import GUI from "lil-gui";
import {moveRigidBody} from "./movable";
import {move6DofBox, rotate6DofBox} from "./cubesGeneric6DofConstraint.js";
import {TrackballControls} from "three/examples/jsm/controls/TrackballControls.js";
import {ri} from "./script.js";

export function createThreeScene() {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    // Renderer:
    ri.renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
    ri.renderer.setSize(window.innerWidth, window.innerHeight);
    ri.renderer.setClearColor(0xBFD104, 0xff);  //farge, alphaverdi.
    ri.renderer.shadowMap.enabled = true; //NB!
    ri.renderer.shadowMapSoft = true;
    ri.renderer.shadowMap.type = THREE.PCFSoftShadowMap; //THREE.BasicShadowMap;

    // Scene
    ri.scene = new THREE.Scene();
    ri.scene.background = new THREE.Color( 0xdddddd );

    // lil-gui kontroller:
    ri.lilGui = new GUI();

    // Sceneobjekter
    addLights();

    // Kamera:
    ri.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);
    ri.camera.position.x = 15;
    ri.camera.position.y = 17;
    ri.camera.position.z = 27;

    // TrackballControls:
    ri.controls = new TrackballControls(ri.camera, ri.renderer.domElement);
    ri.controls.addEventListener( 'change', renderScene);
}

export function addLights() {
    // Ambient:
    let ambientLight1 = new THREE.AmbientLight(0xffffff, 0.7);
    ambientLight1.visible = true;
    ri.scene.add(ambientLight1);
    const ambientFolder = ri.lilGui.addFolder( 'Ambient Light' );
    ambientFolder.add(ambientLight1, 'visible').name("On/Off");
    ambientFolder.add(ambientLight1, 'intensity').min(0).max(1).step(0.01).name("Intensity");
    ambientFolder.addColor(ambientLight1, 'color').name("Color");

    //** RETNINGSORIENTERT LYS (som gir skygge):
    let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.visible = true;
    directionalLight.position.set(0, 105, 0);

    directionalLight.castShadow = true;     //Merk!
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 5;
    directionalLight.shadow.camera.far = 110;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    ri.scene.add(directionalLight);

    //** POINTLIGHT:
    let pointLight = new THREE.PointLight(0xff9000, 0.5);
    pointLight.visible = true;
    pointLight.position.set(0, 15, 0);
    pointLight.shadow.camera.near = 10;
    pointLight.shadow.camera.far = 31;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.castShadow = true;
    ri.scene.add(pointLight);

    //lil-gui:
    const directionalFolder = ri.lilGui.addFolder( 'Directional Light' );
    directionalFolder.add(directionalLight, 'visible').name("On/Off");
    directionalFolder.add(directionalLight, 'intensity').min(0).max(1).step(0.01).name("Intensity");
    directionalFolder.addColor(directionalLight, 'color').name("Color");
    const pointLigthFolder = ri.lilGui.addFolder( 'Pointlight' );
    pointLigthFolder.add(pointLight, 'intensity').min(0).max(1).step(0.01).name("Intensity");
    pointLigthFolder.addColor(pointLight, 'color').name("Color");
    pointLigthFolder.add(pointLight.position, 'y').min(0).max(100).step(1).name("Height");
}

//Sjekker tastaturet:
export function handleKeys(delta) {
    if (ri.currentlyPressedKeys['KeyH']) {
        createRandomSphere(200);
    }
    const armMesh = ri.scene.getObjectByName("hinge_arm");
    let direction = new THREE.Vector3();
    armMesh.getWorldDirection(direction);  // NB! worldDIRECTION! Gir en vektor som peker mot +Z. FRA DOC: Returns a vector representing the direction of object's positive z-axis in world space.
    let oppositeDirection = new THREE.Vector3();
    armMesh.getWorldDirection(oppositeDirection).multiplyScalar(-1);

    // Gir armen en kraftmoment:
    if (ri.currentlyPressedKeys['KeyV']) {
        pushHingedArm(armMesh, direction);
    }
    if (ri.currentlyPressedKeys['KeyB']) {
        pushHingedArm(armMesh, oppositeDirection);
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

    const box1Movable = ri.scene.getObjectByName("box1Movable");
    if (ri.currentlyPressedKeys['KeyJ']) {
        move6DofBox(box1Movable,{x: -0.2, y: 0, z: 0});
    }
    if (ri.currentlyPressedKeys['KeyL']) {
        move6DofBox(box1Movable,{x: 0.2, y: 0, z: 0});
    }
    if (ri.currentlyPressedKeys['KeyI']) {
        move6DofBox(box1Movable,{x: 0, y: 0, z: -0.2});
    }
    if (ri.currentlyPressedKeys['KeyK']) {
        move6DofBox(box1Movable,{x: 0, y: 0, z: 0.2});
    }

    if (ri.currentlyPressedKeys['KeyN']) {
        rotate6DofBox(box1Movable, Math.PI/3*delta);
    }
    if (ri.currentlyPressedKeys['KeyM']) {
        rotate6DofBox(box1Movable, -Math.PI/3*delta);
    }
}

export function onWindowResize() {
    ri.camera.aspect = window.innerWidth / window.innerHeight;
    ri.camera.updateProjectionMatrix();
    ri.renderer.setSize(window.innerWidth, window.innerHeight);
    ri.controls.handleResize();
    renderScene();
}

export function updateThree(deltaTime) {
    // Endre fjæra:
    let lineMeshStartPosition = ri.scene.getObjectByName('springAnchorMesh', true);
    let lineMeshEndPosition = ri.scene.getObjectByName('springBoxMesh', true);
    // Henter Line-meshet:
    let wireLineMesh = ri.scene.getObjectByName('springLineMesh', true);
    // Henter world-position for start og endepunkt til vaieren:
    const lineVertexPositions = wireLineMesh.geometry.attributes.position.array;

    const lineStartPos = new THREE.Vector3();
    lineMeshStartPosition.getWorldPosition(lineStartPos);
    lineVertexPositions[0] = lineStartPos.x;
    lineVertexPositions[1] = lineStartPos.y;
    lineVertexPositions[2] = lineStartPos.z;

    const lineEndPos = new THREE.Vector3();
    lineMeshEndPosition.getWorldPosition(lineEndPos);
    lineVertexPositions[3] = lineEndPos.x;
    lineVertexPositions[4] = lineEndPos.y;
    lineVertexPositions[5] = lineEndPos.z;
    wireLineMesh.geometry.attributes.position.needsUpdate = true;
    wireLineMesh.geometry.computeBoundingBox();
    wireLineMesh.geometry.computeBoundingSphere();

    //Oppdater trackball-kontrollen:
    ri.controls.update();
}

export function addMeshToScene(mesh) {
    ri.scene.add(mesh);
}

export function renderScene()
{
    ri.renderer.render(ri.scene, ri.camera);
}

export function getRigidBodyFromMesh(meshName) {
    const mesh = ri.scene.getObjectByName(meshName);
    if (mesh)
        return mesh.userData.physicsBody;
    else
        return null;
}

export function addArrowHelper(mesh, direction, origin, name, color=0xff0000, length=10) {
    const meshDirectionArrow = new THREE.ArrowHelper( direction, origin, length, color );
    meshDirectionArrow.name = name;
    mesh.add(meshDirectionArrow);
}

export function addLineBetweenObjects(nameMeshStart, nameMeshEnd) {
    let lineMeshStartPosition = ri.scene.getObjectByName(nameMeshStart, true);
    let lineMeshEndPosition = ri.scene.getObjectByName(nameMeshEnd, true);

    // Wire / Line:
    // Definerer Line-meshet (beståemde av to punkter):
    const lineMaterial = new THREE.LineBasicMaterial( { color: 0x0000ff } );
    const points = [];
    // Finner start- og endepunktmesh:
    const startPoint = new THREE.Vector3();
    const endPoint = new THREE.Vector3();
    // NB! Bruker world-position:
    lineMeshStartPosition.getWorldPosition(startPoint);
    lineMeshEndPosition.getWorldPosition(endPoint);
    points.push(startPoint);
    points.push(endPoint);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
    const springLineMesh = new THREE.Line( lineGeometry, lineMaterial );
    springLineMesh.name = "springLineMesh";
    // NB! Linemeshet legges til scene-objektet.
    addMeshToScene(springLineMesh);
}
