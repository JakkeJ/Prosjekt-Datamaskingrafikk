import {phy} from "./script.js";


export function createAmmoWorld() {
    phy.transform = new Ammo.btTransform();

    // Initialiserer phy.ammoPhysicsWorld:
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    phy.ammoPhysicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    phy.ammoPhysicsWorld.setGravity(new Ammo.btVector3(0, -9.81, 0));
}


// Hentet fra kodeeksempel modul7/ammoShapes1
export function updatePhysics(deltaTime) {
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

    // Kollisjonsdeteksjon:
    checkCollisions(deltaTime);
}


// Hentet fra kodeeksempel modul7/ammoCollisions
// Finner alle manifolds, gjennomløper og gjør noe dersom kollison mellom kulene:
function checkCollisions(deltaTime) {
    // Finner alle mulige kollisjonspunkter/kontaktpunkter (broad phase):
    let numManifolds = phy.ammoPhysicsWorld.getDispatcher().getNumManifolds();
    // Gjennomløper alle kontaktpunkter:
    for (let i=0; i < numManifolds;i++) {
        // contactManifold er et btPersistentManifold-objekt:
        let contactManifold =  phy.ammoPhysicsWorld.getDispatcher().getManifoldByIndexInternal(i);
        let numContacts = contactManifold.getNumContacts();
        if (numContacts>0) {
            // Henter objektene som er involvert:
            // getBody0() og getBody1() returnerer et btCollisionObject,
            // gjøres derfor om til btRigidBody-objekter vha. Ammo.castObject():
            let rbObject0 = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
            let rbObject1 = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);
            let threeMesh0 = rbObject0.threeMesh;
            let threeMesh1 = rbObject1.threeMesh;
            if (threeMesh0 && threeMesh1) {
                for (let j = 0; j < numContacts; j++) {
                    let contactPoint = contactManifold.getContactPoint(j);
                    const distance = contactPoint.getDistance();
                    if (distance <= 0) {

                        if ((threeMesh0.name === 'ball' && threeMesh1.name === 'ball') ||
                            threeMesh1.name === 'ball' && threeMesh0.name === 'ball') {
                            console.log('Balls collide')
                            if (typeof threeMesh0.collisionResponse === 'function') {
                                threeMesh0.collisionResponse(threeMesh0)
                            }
                            if (typeof threeMesh1.collisionResponse === 'function') {
                                threeMesh1.collisionResponse(threeMesh1)
                            }
                        }

                        if ((threeMesh0.name === 'target' && threeMesh1.name === 'cannonBall') ||
                        threeMesh1.name === 'target' && threeMesh0.name === 'cannonBall') {
                            if (typeof threeMesh0.collisionResponse === 'function') {
                                threeMesh0.collisionResponse(threeMesh0)
                            }
                            if (typeof threeMesh1.collisionResponse === 'function') {
                                threeMesh1.collisionResponse(threeMesh1)
                            }
                        }

                        if ((threeMesh0.name === 'cannonBody' && threeMesh1.name === 'ball') ||
                        threeMesh1.name === 'cannonBody' && threeMesh0.name === 'ball') {
                            
                            if (typeof threeMesh0.collisionResponse === 'function') {
                                threeMesh0.collisionResponse(threeMesh0)
                            }
                            if (typeof threeMesh1.collisionResponse === 'function') {
                                threeMesh1.collisionResponse(threeMesh1) 
                            }
                        }

                        if ((threeMesh0.name === 'ball' && threeMesh1.name === 'spiral') ||
                            threeMesh0.name === 'spiral' && threeMesh1.name === 'ball') {
                                if (typeof threeMesh0.collisionResponse === 'function') {
                                    threeMesh0.collisionResponse(threeMesh0)
                                }
                                if (typeof threeMesh1.collisionResponse === 'function') {
                                    threeMesh1.collisionResponse(threeMesh1)
                                }
                            }
                        if ((threeMesh0.name === 'golfClubStopper' && threeMesh1.name === 'cannonBall') ||
                        threeMesh1.name === 'golfClubStopper' && threeMesh0.name === 'cannonBall') {
    
                            if (typeof threeMesh0.collisionResponse === 'function') {
                                threeMesh0.collisionResponse(threeMesh0)
                            }
                            if (typeof threeMesh1.collisionResponse === 'function') {
                                threeMesh1.collisionResponse(threeMesh1)
                            }
                        }

                        if ((threeMesh0.name === 'golfClub' && threeMesh1.name === 'ball') ||
                        threeMesh1.name === 'golfClub' && threeMesh0.name === 'ball') {
                            
                            if (typeof threeMesh0.collisionResponse === 'function') {
                                threeMesh0.collisionResponse(threeMesh0)
                            }
                            if (typeof threeMesh1.collisionResponse === 'function') {
                                threeMesh1.collisionResponse(threeMesh1) 
                            }
                        }

                        if ((threeMesh0.name === 'TV' && threeMesh1.name === 'golfBall') ||
                            threeMesh1.name === 'TV' && threeMesh0.name === 'golfBall') {
    
                            if (typeof threeMesh0.collisionResponse === 'function') {
                                threeMesh0.collisionResponse(threeMesh0)
                            }
                            if (typeof threeMesh1.collisionResponse === 'function') {
                                threeMesh1.collisionResponse(threeMesh1)
                            }
                        }
                    }
                }
            }
        }
    }
}


// Hentet fra kodeeksempel modul7/ammoShapes1, modifisert
export function createAmmoRigidBody(shape, threeMesh, restitution=0.7, friction=0.8, position={x:0, y:50, z:0}, mass=1, useLocalScaling=true) {

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
