import * as THREE from "three";
import {addMeshToScene} from "./myThreeHelper.js";
import {createAmmoRigidBody} from "./ammoHelpers.js";
import {phy} from "./script.js";
import {
    COLLISION_GROUP_BOX, COLLISION_GROUP_MOVEABLE, COLLISION_GROUP_PLANE,
    COLLISION_GROUP_SPHERE, COLLISION_GROUP_SPRING
} from "./myAmmoHelper";


export function createMovable(color=0xffaaff, position={x:0, y:0.7, z:-40}) {
    const sideLength = 1.5;
    const mass = 0; //Merk!

    //THREE
    let mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sideLength,sideLength,sideLength, 1, 1),
        new THREE.MeshStandardMaterial({color: color}));
    mesh.name = 'movable';
    position.y = position.y + mesh.scale.y*sideLength/2;
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    //AMMO
    let width = mesh.geometry.parameters.width;
    let height = mesh.geometry.parameters.height;
    let depth = mesh.geometry.parameters.depth;


    let shape = new Ammo.btBoxShape( new Ammo.btVector3( width/2, height/2, depth/2) );
    let rigidBody = createAmmoRigidBody(shape, mesh, 0.7, 0.8, position, mass);
    // Følgende er avgjørende for å kunne flytte på objektet:
    // 2 = BODYFLAG_KINEMATIC_OBJECT: Betyr kinematic object, masse=0 men kan flyttes!
    rigidBody.setCollisionFlags(rigidBody.getCollisionFlags() | 2);
    // 4 = BODYSTATE_DISABLE_DEACTIVATION, dvs. "Never sleep".
    rigidBody.setActivationState(4);
    mesh.userData.physicsBody = rigidBody;

    // Legger til physics world:
    phy.ammoPhysicsWorld.addRigidBody(
        rigidBody,
        COLLISION_GROUP_MOVEABLE,
        COLLISION_GROUP_SPHERE |
        COLLISION_GROUP_PLANE |
        COLLISION_GROUP_BOX |
        COLLISION_GROUP_SPRING
    );

    addMeshToScene(mesh);
    phy.rigidBodies.push(mesh);
    rigidBody.threeMesh = mesh;
}


/**
 * Flytte kinetic rigid bodies.
 * @param movableMesh
 * @param direction
 */
export function moveRigidBody(movableMesh, direction) {
    let transform = new Ammo.btTransform();
    let motionState = movableMesh.userData.physicsBody.getMotionState();
    motionState.getWorldTransform(transform);
    let position = transform.getOrigin();
    transform.setOrigin(new Ammo.btVector3(position.x() + direction.x, position.y() + direction.y, position.z() + direction.z));
    motionState.setWorldTransform(transform);
}


export function moveRigidBodyAnimation(movableMesh, position, direction) {
    let transform = new Ammo.btTransform();
    let motionState = movableMesh.userData.physicsBody.getMotionState();
    motionState.getWorldTransform(transform);
    transform.setOrigin(new Ammo.btVector3(position.x + direction.x, position.y + direction.y, position.z + direction.z,));
    motionState.setWorldTransform(transform);
}


export function rotateRigidBody(movableMesh, rotation) {
    let transform = new Ammo.btTransform();
    let motionState = movableMesh.userData.physicsBody.getMotionState();
    motionState.getWorldTransform(transform);

    let quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(rotation);
    let ammoQuaternion = new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

    transform.setRotation(ammoQuaternion);
    motionState.setWorldTransform(transform);

    // Directly update the rigid body's world transform
    movableMesh.userData.physicsBody.setWorldTransform(transform);

    // Activate the body to update in physics simulation
    movableMesh.userData.physicsBody.activate();
}
