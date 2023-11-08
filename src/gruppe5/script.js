import './style.css';
import * as THREE from "three";
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import GUI from 'lil-gui'

const ri = {
    currentlyPressedKeys: [],
}


export function main() {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    ri.renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
    ri.renderer.setSize(window.innerWidth, window.innerHeight);
    ri.renderer.shadowMap.enabled = true;
    ri.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    ri.scene = new THREE.Scene();
    ri.scene.background = new THREE.Color(0xe4f3f0);

    ri.lilGui = new GUI();

    // Clock for animation
    ri.clock = new THREE.Clock();

    ri.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    ri.camera.position.set( 10, 2, 5 );
    ri.camera.lookAt( 0, 0, 0 );
    ri.armCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    ri.controls = new OrbitControls(ri.camera, ri.renderer.domElement);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keyup', handleKeyUp, false);
    document.addEventListener('keydown', handleKeyDown, false);

    addToScene()
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
        ground()
        animate(0)
    }
}


function animate(currentTime) {
    window.requestAnimationFrame((currentTime) => {animate(currentTime);});
    // console.log('Current time: '+currentTime)

    // Time interval for smooth movement regardless of FPS:
    let delta = ri.clock.getDelta();

    renderCamera()

}


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


function ground() {
    const geometry = new THREE.BoxGeometry(50, 1, 50);
    const groundTexture = new THREE.MeshBasicMaterial({map: ri.textures.johnny, side: THREE.DoubleSide});
    const mesh = new THREE.Mesh(geometry, groundTexture);

    mesh.name = 'ground';
    //mesh.castShadow = true;
    mesh.receiveShadow = true;

    ri.scene.add(mesh);
}