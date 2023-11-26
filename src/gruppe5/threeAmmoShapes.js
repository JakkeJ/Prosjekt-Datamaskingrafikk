import * as THREE from "three";
import {ri} from "./script.js";
import {createAmmoRigidBody} from "./ammoHelpers.js";
import {createAmmoMesh, createHeightFieldShape, getHeigtdataFromImage} from "./threeAmmoHelpers.js";
import * as TWEEN from "@tweenjs/tween.js";
import {moveRigidBodyAnimation} from "./movable.js";


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

// Basert på kode hentet fra kodeeksempel modul8/ammoTerrain1
export function terrain(position = {x: 0, y: 5, z: 0}) {
    const planeLength = 10;
    const heightDivisor = 100

    const heightmap = ri.textures.heightmap1;
    const texture = ri.textures.grass;
    texture.wrapS = texture.wrapT= THREE.RepeatWrapping;
    texture.repeat.set(3, 3);

    const heightmapWidth = heightmap.image.width;
    const heightmapHeight = heightmap.image.height;

    const heightData = getHeigtdataFromImage(heightmap.image, heightmapWidth, heightmapHeight, heightDivisor);

    // Ammo shape (ammoHeightFieldShape):
    const heightFieldData = createHeightFieldShape(heightData, heightmapWidth, heightmapHeight);
    heightFieldData.heightFieldShape.setMargin( 0.05 );

    // Three
    const geometry = new THREE.PlaneGeometry(
        planeLength,
        planeLength,
        heightmapWidth - 1,
        heightmapHeight - 1
    );

    geometry.rotateX( - Math.PI / 2 );
    // Setter y-verdien til PlaneGeometry i forhold til høydeverdiene. Gjennomløper alle vertekser:
    const vertices = geometry.attributes.position.array;
    // Sentrerer vha. delta:
    // Ammo-shapen blir (automatisk) sentrert om origo basert på terrainMinHeight og terrainMaxHeight.
    // Må derfor korrigere THREE.PlaneGeometry sine y-verdier i forhold til dette.
    // Justerer tilsvarende delta = minHeigt + (maxHeight - minHeight)/2.
    const delta = (heightFieldData.terrainMinHeight + ((heightFieldData.terrainMaxHeight-heightFieldData.terrainMinHeight)/2));
    for ( let i = 0; i< heightData.length; i++) {
        // 1 + (i*3) siden det er y-verdien som endres:
        vertices[ 1 + (i*3) ] = heightData[i] - delta ;
    }
    // Oppdater normaler (for korrekt belysning):
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh( geometry, material );
    mesh.name = 'terrain';
    mesh.receiveShadow = true;

    ri.scene.add(mesh);

    const scaleX = planeLength / ( heightmapWidth - 1 );
    const scaleZ = planeLength / ( heightmapHeight - 1 );
    heightFieldData.heightFieldShape.setLocalScaling( new Ammo.btVector3( scaleX, 1, scaleZ ) );

    createAmmoRigidBody(
        heightFieldData.heightFieldShape,
        mesh,
        0.5,
        0.3,
        position,
        0,
        false
    );
}

export function steps(position, rotation = 0, numberOfSteps = 6) {
    const groupMesh = new THREE.Group();
    const stepMesh1 = new THREE.Group();
    const stepMesh2 = new THREE.Group();
    const wallGroupMesh = new THREE.Group();
    const compoundShape1 = new Ammo.btCompoundShape();
    const compoundShape2 = new Ammo.btCompoundShape();
    const wallCompoundShape = new Ammo.btCompoundShape();

    const mass = 0;
    // const size = {x:1.5,y:8,z:1.5};
    const size = {x:1,y:8,z:1};
    const name = 'steps'
    const offset = 2 // height offset per step

    const stepShape = new THREE.Shape();
    stepShape.moveTo( -size.x/2,-size.y/2 );
    stepShape.lineTo(-size.x/2, size.y/2);
    stepShape.lineTo(size.x/2, size.y/2 * 0.8);
    stepShape.lineTo(size.x/2, -size.y/2);

    const wallShape = new THREE.Shape();
    wallShape.moveTo( -size.x/2,0 );
    wallShape.lineTo(-size.x/2, size.y/2 + offset);
    wallShape.lineTo(-size.x/2 + numberOfSteps*size.x, size.y/2 + numberOfSteps*offset);
    wallShape.lineTo(-size.x/2 + numberOfSteps*size.x, -offset + numberOfSteps*offset);

    const stepExtrudeSettings = {
        depth: size.z,
        bevelEnabled: false,
    };
    const wallExtrudeSettings = {
        depth: 0.3,
        bevelEnabled: false,
    };

    const stepGeometry = new THREE.ExtrudeGeometry( stepShape, stepExtrudeSettings );
    const stepMaterial = new THREE.MeshStandardMaterial({
        color: 0xBC6A00,
        side: THREE.DoubleSide});

    const wallGeometry = new THREE.ExtrudeGeometry( wallShape, wallExtrudeSettings );
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3});

    const mesh = new THREE.Mesh(stepGeometry, new THREE.MeshBasicMaterial());
    const wallMesh = new THREE.Mesh(wallGeometry, new THREE.MeshBasicMaterial());

    let useFirst = true;

    for (let i = 0; i <numberOfSteps; i++) {
        if (useFirst) {// createAmmoMesh('box', geometry, size, {x: i * size.x, y: 0, z: 0}, {x: 0, y: 0, z: 0},material, stepMesh1, compoundShape1, 'step1')
            createAmmoMesh('triangleShape', stepGeometry, mesh, {x: i * size.x, y: i * offset, z: -size.z/2}, {x: 0, y: 0, z: 0}, stepMaterial, stepMesh1, compoundShape1, 'step1')// stepMesh1.add(mesh)
        }
        else {// createAmmoMesh('box', geometry, size, {x: i * size.x, y: 0, z: 0}, {x: 0, y: 0, z: 0},material, stepMesh2, compoundShape2, 'step2')
            createAmmoMesh('triangleShape', stepGeometry, mesh, {x: i * size.x, y: i * offset, z: -size.z/2}, {x: 0, y: 0, z: 0}, stepMaterial, stepMesh2, compoundShape2, 'step1')// stepMesh2.add(mesh)
        }
        useFirst = !useFirst;
    }

    // Sidewalls
    createAmmoMesh('triangleShape', wallGeometry, wallMesh, {x: 0, y: 0, z: -0.3 - size.z/2 - 0.001}, {x: 0, y: 0, z: 0}, wallMaterial, wallGroupMesh, wallCompoundShape, 'wall')
    createAmmoMesh('triangleShape', wallGeometry, wallMesh, {x: 0, y: 0, z: size.z/2 + 0.001}, {x: 0, y: 0, z: 0}, wallMaterial, wallGroupMesh, wallCompoundShape, 'wall')

    groupMesh.name = name
    groupMesh.add(stepMesh1)
    groupMesh.add(stepMesh2)
    groupMesh.add(wallGroupMesh)

    stepMesh1.rotation.y = rotation * Math.PI / 180
    stepMesh2.rotation.y = rotation * Math.PI / 180
    wallGroupMesh.rotation.y = rotation * Math.PI / 180

    ri.scene.add(groupMesh);

    const rigidBody1 = createAmmoRigidBody(compoundShape1, stepMesh1, 0.1, 0.1, position, mass);
    const rigidBody2 = createAmmoRigidBody(compoundShape2, stepMesh2, 0.1, 0.1, position, mass);
    const wallRigidBody = createAmmoRigidBody(wallCompoundShape, wallGroupMesh, 0.1, 0.1, position, mass);

    // Make object movable:
    rigidBody1.setCollisionFlags(rigidBody1.getCollisionFlags() | 2);  // 2 = BODYFLAG_KINEMATIC_OBJECT: Betyr kinematic object, masse=0 men kan flyttes!
    rigidBody1.setActivationState(4);  // 4 = BODYSTATE_DISABLE_DEACTIVATION, dvs. "Never sleep".
    rigidBody2.setCollisionFlags(rigidBody2.getCollisionFlags() | 2);  // 2 = BODYFLAG_KINEMATIC_OBJECT: Betyr kinematic object, masse=0 men kan flyttes!
    rigidBody2.setActivationState(4);  // 4 = BODYSTATE_DISABLE_DEACTIVATION, dvs. "Never sleep".

    const val = offset;
    const duration = 1100;

    function newTween(value, duration, mesh2move) {
        return new TWEEN.Tween({y: 0})
            .to({y: value}, duration)
            .yoyo(true)
            .repeat(1)
            .onUpdate(function (newPosition) {
                // groupMesh.position.y = position.y + newPosition.y
                moveRigidBodyAnimation(mesh2move, position, {x: 0, y: newPosition.y, z: 0})
            })
    }

    // Move steps up
    let tween1 = newTween(val, duration, stepMesh1)
    let tween2 = newTween(val, duration, stepMesh2)
    // Move steps down
    let tween3 = newTween(-val, duration, stepMesh1)
    let tween4 = newTween(-val, duration, stepMesh2)

    tween1.chain(tween2, tween3)
    tween2.chain(tween1, tween4)

    tween1.start()
    tween4.start()

    // Ball for testing
    // let ballPos = {x:position.x, y:position.y +  size.y/2, z:position.z + size.z/2}
    // ball(ballPos, 0.3, 10, 0.1)
    // rails(ballPos, rotation, -5, 8, true)
    // ballPos.z += 7.5
    // ballPos.y += 2
    // ball(ballPos, 0.3, 10, 0.1)
    // groupMesh.tween = tween1
}


