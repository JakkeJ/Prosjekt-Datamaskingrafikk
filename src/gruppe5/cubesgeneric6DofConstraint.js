import * as THREE from "three";
import {createAmmoRigidBody, phy} from "./myAmmoHelper.js";
import {addMeshToScene} from "./myThreeHelper.js";
import {
    COLLISION_GROUP_BOX,
    COLLISION_GROUP_SPRING,
    COLLISION_GROUP_MOVEABLE,
    COLLISION_GROUP_PLANE,
    COLLISION_GROUP_SPHERE
} from "./myAmmoHelper";

/**
 * Begrenser boksens bevegelighet ifht. et punkt utenfor boksen (pivot).
 */
export function create6DofBoxes() {

    //BOX1 (rosa):
    const box1 = createBox("box1Movable",
        0,
        {x: 17, y: 9, z: 17},
        5,
        0.5,
        5,
        0xF090AF,
        true,
        false
    );
    makeRigidBodyMovable(box1.rigidBody);
    // Henter ut gjeldende btMotionState-objekt for å kunne rotere kuben:
    let transform = new Ammo.btTransform();
    let motionState = box1.rigidBody.getMotionState();
    motionState.getWorldTransform(transform);
    // Roterer meshet
    box1.mesh.rotateY(Math.PI/4);
    // Bruker mesh-rotasjon til å rotere rigidBody:
    let rotation = box1.mesh.quaternion;
    transform.setRotation(new Ammo.btQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    motionState.setWorldTransform(transform);

    //BOX2 (blå):
    const box2 = createBox(
        "box",
        20,
        {x: 0, y: 0, z: 0},
        1.2,
        5,
        1.2,
        0x03A0E9
    );

    //6Dof-constraint mellom pivot (i lokale koordinater, dvs. i forhold til boksens lokale koordinatsystem) boksen:
    const transform1 = new Ammo.btTransform();
    transform1.setIdentity();
    transform1.setOrigin( new Ammo.btVector3( 0, 0, 0 ) );

    const transform2 = new Ammo.btTransform();
    transform2.setIdentity();
    transform2.setOrigin( new Ammo.btVector3( 0, 3, 0 ) );

    const dofConstraint = new Ammo.btGeneric6DofConstraint(
        box1.rigidBody,
        box2.rigidBody,
        transform1,
        transform2,
        false );
    //dofConstraint.calculateTransform();
    // NB! Disse er viktig for at ikke den hengende kuben ikke skal rotere om alle akser!!
    // Disse gjør at den hengende boksen ikke roterer når den er festet til en constraint (se side 130 i Bullet-boka).
    dofConstraint.setAngularLowerLimit(new Ammo.btVector3(0, 0.0, 0.0));
    dofConstraint.setAngularUpperLimit(new Ammo.btVector3(0, 0.0, 0.0));
    // Justerer ev. "styrken", i hver akse (i begge retninger):
    const cfm = 0.9;    // cfm = Constraint Force Mixing,
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_CFM, cfm, 0);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_CFM, cfm, 1);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_CFM, cfm, 2);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_CFM, cfm, 3);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_CFM, cfm, 4);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_CFM, cfm, 5);
    // Justerer ev. 'error reduction', i hver akse (i begge retninger)
    const erp = 0.2;    // erp = Error Reduction Parameter
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_ERP, erp, 0);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_ERP, erp, 1);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_ERP, erp, 2);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_ERP, erp, 3);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_ERP, erp, 4);
    dofConstraint.setParam(Ammo.BT_CONSTRAINT_STOP_ERP, erp, 5);

    // Siste parameter disabler kollisjon mellom objektene (true = ingen kollisjon, siden vi har kun et objekt):
    phy.ammoPhysicsWorld.addConstraint( dofConstraint, true );
}

function createBox(
    name="box",
    mass=10,
    position = {x: -5, y: 4, z: 5},
    width=2,
    height=2,
    depth=2,
    color=0xF090AF,
    setLocalScaling=true,
    setRotation=true
) {

    // Three:
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshPhongMaterial({color: color}));
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.name = name;
    addMeshToScene(mesh);
    phy.rigidBodies.push(mesh);

    // Ammo:
    const boxShape = new Ammo.btBoxShape( new Ammo.btVector3( width/2, height/2, depth/2 ) );
    const rigidBody = createAmmoRigidBody(boxShape, mesh, 0.4, 0.6, position, mass, setLocalScaling, setRotation);
    rigidBody.threeMesh = mesh;
    mesh.userData.physicsBody = rigidBody;
    // 4 = BODYSTATE_DISABLE_DEACTIVATION, dvs. "Never sleep".
    rigidBody.setActivationState(4);

    // Legger til physics world:
    phy.ammoPhysicsWorld.addRigidBody(
        rigidBody,
        COLLISION_GROUP_BOX,
        COLLISION_GROUP_BOX |
        COLLISION_GROUP_SPHERE |
        COLLISION_GROUP_MOVEABLE |
        COLLISION_GROUP_PLANE
    );

    return {
        mesh: mesh,
        rigidBody: rigidBody
    }
}

function makeRigidBodyMovable(rigidBody) {
    // Følgende er avgjørende for å kunne flytte på objektet:
    // 2 = BODYFLAG_KINEMATIC_OBJECT: Betyr kinematic object, masse=0 men kan flyttes!
    rigidBody.setCollisionFlags(rigidBody.getCollisionFlags() | 2);
    // 4 = BODYSTATE_DISABLE_DEACTIVATION, dvs. "Never sleep".
    rigidBody.setActivationState(4);
}
/**
 * Flytte kinetic rigid bodies.
 * @param movableMesh
 * @param direction
 */
export function move6DofBox(mesh, direction) {
    let transform = new Ammo.btTransform();
    let motionState = mesh.userData.physicsBody.getMotionState();
    motionState.getWorldTransform(transform);
    let position = transform.getOrigin();
    transform.setOrigin(new Ammo.btVector3(position.x() + direction.x, position.y() + direction.y, position.z() + direction.z));
    motionState.setWorldTransform(transform);
}

/**
 * Roterer kinetic rigid body
 * @param mesh
 * @param delta
 */
export function rotate6DofBox(mesh, delta) {
    let transform = new Ammo.btTransform();
    let motionState = mesh.userData.physicsBody.getMotionState();
    motionState.getWorldTransform(transform);
    // Roterer meshet
    mesh.rotateY(delta);
    let rotation = mesh.quaternion;
    // Bruker mesh-rotasjonen på rigidBody-objektet:
    transform.setRotation(new Ammo.btQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    motionState.setWorldTransform(transform);
}
