import {phy} from "./script.js";


export function createAmmoWorld() {
    phy.transform = new Ammo.btTransform();

    // Initialiserer phy.ammoPhysicsWorld:
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    phy.ammoPhysicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    phy.ammoPhysicsWorld.setGravity(new Ammo.btVector3(0, -9.81, 0));
}