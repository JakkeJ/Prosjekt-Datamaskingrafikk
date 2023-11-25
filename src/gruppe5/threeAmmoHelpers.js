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
