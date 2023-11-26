import * as THREE from "three";


export function moveRigidBodyAnimation(movableMesh, position, movement) {
    let transform = new Ammo.btTransform();
    let motionState = movableMesh.userData.physicsBody.getMotionState();
    motionState.getWorldTransform(transform);
    transform.setOrigin(new Ammo.btVector3(position.x + movement.x, position.y + movement.y, position.z + movement.z,));
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
