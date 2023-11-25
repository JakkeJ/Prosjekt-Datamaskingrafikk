import {generateTriangleShape} from "./triangleMeshHelpers.js";
import * as THREE from "three";
import {createAmmoRigidBody} from "./ammoHelpers.js";
import {ri} from "./script.js";


export function createAmmoMesh(shapeType, geometry, size, meshPosition, meshRotation, texture, groupMesh, compoundShape, name = "",rotateType) {
    let shape;
    if (shapeType === 'box') {
        shape = new Ammo.btBoxShape(new Ammo.btVector3(size.x/2, size.y/2, size.z/2));

    } else if (shapeType === 'cylinder') {
        if (size.radius1){
            shape = new Ammo.btCylinderShape(new Ammo.btVector3(size.radius1, size.height/2, size.radius2));
        }
        else{
            shape = new Ammo.btCylinderShape(new Ammo.btVector3(size.x, size.z/2, size.y));
        }

    } else if (shapeType === 'sphere') {
        shape = new Ammo.btSphereShape(size.radius);
    } else if (shapeType === 'triangleShape') {
        shape = generateTriangleShape(size, false)
    }

    let mesh = new THREE.Mesh(geometry, texture);
    mesh.name = name
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(meshPosition.x, meshPosition.y, meshPosition.z);

    if (rotateType === 'quaternion_norm') {
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), meshRotation);
    } else {
        mesh.rotateX(meshRotation.x);
        mesh.rotateY(meshRotation.y);
        mesh.rotateZ(meshRotation.z);
    }


    let rotation = new THREE.Quaternion();
    if (meshRotation.x !== 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), meshRotation.x)}
    if (meshRotation.y !== 0) {
        rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), meshRotation.y)}
    if (meshRotation.z !== 0) {
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


// Kode hentet fra kodeeksempel
export function getHeigtdataFromImage(image, width, height, divisor= 3) {
    // Lager et temporært canvas-objekt:
    let canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    // Henter ut en 2D-context som gjør at man kan tegne på canvaset:
    let context = canvas.getContext('2d');
    let size = width * height;
    // Lager et Float32Array som kan holde på alle pikslene til canvaset:
    let heightData = new Float32Array(size);
    // Tegner image på  canvaset:
    context.drawImage(image, 0, 0);
    // Nullstiller heightData-arrayet:
    for (let i = 0; i < size; i++) {
        heightData[i] = 0;
    }

    //imageData = et ImageData-objekt. Inneholder pikseldata. Hver piksel består av en RGBA-verdi (=4x8 byte).
    let imageData = context.getImageData(0, 0, width, height);

    // pixelDataUint8 = et Uint8ClampedArray - array. Uint8, tilsvarer en byte (0-255).
    // Pikseldata ligger etter hverandre i pixelDataUint8. 4 byte per piksel.
    let pixelDataUint8 = imageData.data;
    let j = 0;
    //Gjennomløper pixelDataUint8, piksel for piksel (i += 4).
    // Setter heightData for hver piksel lik summen av fargekomponentene / 3:
    for (let i = 0, n = pixelDataUint8.length; i < n; i += 4) {
        let sumColorValues = pixelDataUint8[i] + pixelDataUint8[i + 1] + pixelDataUint8[i + 2];
        heightData[j++] = sumColorValues / divisor;
    }
    return heightData;
}


// Kode hentet fra kodeeksempel modul8/ammoTerrain1
export function createHeightFieldShape(heightData, heightMapPixelWidth, heightMapPixelHeight) {

    // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
    let heightScale = 1;

    // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
    let upAxis = 1;

    // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
    let hdt = "PHY_FLOAT";

    // Set this to your needs (inverts the triangles)
    let flipQuadEdges = false;

    // Creates height data buffer in Ammo heap
    const ammoHeightData = Ammo._malloc( 4 * heightMapPixelWidth * heightMapPixelHeight );

    // NB! Viktig å finne og sette this.terrainMaxHeight og this.terrainMinHeight:
    let p = 0;
    let p2 = 0;
    let terrainMaxHeight = Number.NEGATIVE_INFINITY;     //NB! setter til en lav (nok) verdi for å være sikker.
    let terrainMinHeight = Number.POSITIVE_INFINITY;      //NB! setter til en høy (nok) verdi for å være sikker.
    // Copy the javascript height data array to the Ammo one.
    for ( let j = 0; j < heightMapPixelHeight; j ++ ) {
        for ( let i = 0; i < heightMapPixelWidth; i ++ ) {
            if (heightData[p] < terrainMinHeight)
                terrainMinHeight = heightData[p];
            if (heightData[p] >= terrainMaxHeight)
                terrainMaxHeight = heightData[p];
            // write 32-bit float data to memory  (Se: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Right_shift)
            Ammo.HEAPF32[ammoHeightData + p2 >> 2] = heightData[ p ];   // >>  Signed right shift. Shifts right by pushing copies of the leftmost bit in from the left, and let the rightmost bits fall off.
            p ++;
            // 4 bytes/float
            p2 += 4;
        }
    }
    // Creates the heightfield physics shape
    let heightFieldShape = new Ammo.btHeightfieldTerrainShape(
        heightMapPixelWidth,
        heightMapPixelHeight,
        ammoHeightData,
        heightScale,
        terrainMinHeight,
        terrainMaxHeight,
        upAxis,
        hdt,
        flipQuadEdges
    );

    return {
        terrainMinHeight: terrainMinHeight,
        terrainMaxHeight: terrainMaxHeight,
        heightFieldShape: heightFieldShape
    };
}


export function ground() {
    const position = {x: 0, y: -2.5, z: 0};
    const size = {x: 100, y:5, z: 100};

    // THREE
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const texture = ri.textures.grass;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(10,10);
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide});
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = 'ground';
    mesh.receiveShadow = true;

    ri.scene.add(mesh);

    // AMMO
    let shape = new Ammo.btBoxShape(new Ammo.btVector3(size.x/2, size.y/2, size.z/2));
    createAmmoRigidBody(shape, mesh, 0.7, 0.8, position, 0);
}
