import * as THREE from "three";
import {phy, ri} from "./script.js";
import {createAmmoRigidBody} from "./ammoHelpers.js";
import {createAmmoMesh, createHeightFieldShape, getHeigtdataFromImage} from "./threeAmmoHelpers.js";
import * as TWEEN from "@tweenjs/tween.js";
import {moveRigidBodyAnimation} from "./movable.js";
import {createTriangleShapeAddToCompound} from "./triangleMeshHelpers.js";
import {degToRad} from "three/src/math/MathUtils.js";
import {addLineBetweenObjects} from "./threeHelpers.js";


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


export function ball(position, radius = 0.3, mass = 5, restitution = 0.7, friction = 0.8, name = "ball") {
    // THREE
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        metalness: 0.5,
        roughness: 0.3});
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    ri.scene.add(mesh);
    ri.balls.push(mesh)

    // AMMO
    const shape = new Ammo.btSphereShape(radius);
    const rigidBody = createAmmoRigidBody(shape, mesh, restitution, friction, position, mass);

    rigidBody.setActivationState(4)
}


export function cube(position, size, rotation = 0 , name = 'cube', mass = 0, color = 0xFF00FF, restitution = 0.5, friction = 0.8) {
    // THREE
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide});
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = name
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.y = rotation * Math.PI / 180

    ri.scene.add(mesh);

    // AMMO
    const shape = new Ammo.btBoxShape(new Ammo.btVector3(size.x/2, size.y/2, size.z/2));
    createAmmoRigidBody(shape, mesh, restitution, friction, position, mass);
}


export function tableMesh(groupMesh, compoundShape, size, rotation, height, name = 'table', color = 0xFFFFFF) {
    const material = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide});
    const position = {x: 0, y: 0, z: 0};

    groupMesh.name = name;

    // tabletop
    let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    createAmmoMesh('box', geometry, size, position, rotation, material, groupMesh, compoundShape );

    // legs
    const width = (size.x + size.z) / 2 / 20;
    position.y = -height/2;
    const xOffset = size.x/2 - width;
    const zOffset = size.z/2 - width;
    const legSize = {x: width, y: height, z: width};

    position.x = xOffset;
    position.z = zOffset;
    geometry = new THREE.BoxGeometry(width, height, width);
    createAmmoMesh('box', geometry, legSize, position, rotation, material, groupMesh, compoundShape );

    position.x = -xOffset;
    geometry = new THREE.BoxGeometry(width, height, width);
    createAmmoMesh('box', geometry, legSize, position, rotation, material, groupMesh, compoundShape );

    position.z = -zOffset;
    geometry = new THREE.BoxGeometry(width, height, width);
    createAmmoMesh('box', geometry, legSize, position, rotation, material, groupMesh, compoundShape );

    position.x = xOffset;
    geometry = new THREE.BoxGeometry(width, height, width);
    createAmmoMesh('box', geometry, legSize, position, rotation, material, groupMesh, compoundShape );
}


export function funnel(position, upperRadius = 2.7, lowerRadius = 0.5, height = 2) {
    const compoundShape = new Ammo.btCompoundShape();

    const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide,
        metalness: 0.4,
        roughness: 0.3});

    const points = [
        new THREE.Vector2(lowerRadius, 0),
        new THREE.Vector2(lowerRadius, height * 0.3),
        new THREE.Vector2(upperRadius, height),
    ];

    const geometry = new THREE.LatheGeometry(points, 128, 0, 2 * Math.PI);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'funnel';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.material.transparent = true;
    mesh.material.opacity = 0.5;

    ri.scene.add(mesh);

    createTriangleShapeAddToCompound(compoundShape, mesh);

    createAmmoRigidBody(compoundShape, mesh, 0.4, 0.6, position, 0);

    // Ball+rail to test funnel
    /*let railPosition = {x: position.x + upperRadius*0.9, y: position.y + height + 1, z: position.z + 5}
    rails(railPosition, -90, 10, 5)
    let ballPosition = {x: railPosition.x, y: railPosition.y + 0.6, z: railPosition.z - 0.2}
    ball(ballPosition, lowerRadius*0.9, 5, 0.85)*/
}


export function rails(position, rotation = 180, tilt = 20, length = 4, guardrails = false, friction = 0.8) {
    let material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        metalness: 0.5,
        roughness: 0.3});

    const groupMesh = new THREE.Group();
    groupMesh.rotateY(degToRad(rotation));
    groupMesh.rotateZ(degToRad(90 + tilt));
    groupMesh.name = 'rails';

    const width = 0.05;
    const distance = 0.4;
    const size = {radius1: width, radius2: width, height: length};

    const compoundShape = new Ammo.btCompoundShape();
    const geometry = new THREE.CylinderGeometry(width, width, length, 36, 1);

    let railPosition = {x: 0, y: length/2, z: distance/2};

    // Rail 1:
    createAmmoMesh('cylinder', geometry, size, railPosition, {x: 0, y: 0, z: 0}, material, groupMesh, compoundShape );

    // Rail 2:
    railPosition.z = -distance/2;
    createAmmoMesh('cylinder', geometry, size, railPosition, {x: 0, y: 0, z: 0}, material, groupMesh, compoundShape );

    if (guardrails) {
        railPosition = {x: distance, y: length/2, z: distance};
        // Guardrail 1:
        createAmmoMesh('cylinder', geometry, size, railPosition, {x: 0, y: 0, z: 0}, material, groupMesh, compoundShape );

        // Guardrail 2:
        railPosition.z = -distance;
        createAmmoMesh('cylinder', geometry, size, railPosition, {x: 0, y: 0, z: 0}, material, groupMesh, compoundShape );
    }

    ri.scene.add(groupMesh);

    createAmmoRigidBody(compoundShape, groupMesh, 0, friction, position, 0);
}


export function domino(position, starter = true) {
    const tableSize = {x: 5, y: 0.05, z: 10};

    const groupMesh = new THREE.Group();
    const compoundShape = new Ammo.btCompoundShape();

    tableMesh(groupMesh, compoundShape, tableSize, {x: 0, y: 0, z: 0}, position.y, 'dominoTable',  0x823c17)

    ri.scene.add(groupMesh);

    createAmmoRigidBody(compoundShape, groupMesh, 0.5, 0.5, position, 0);

    const dominoSize = {x: 0.4, y: 0.8, z: 0.08};
    const posX = position.x - 2.5;
    const posY = position.y + 0.5;
    const posZ = position.z - 5;
    const dominoPositions = [
        {x: posX + 2.5, y: posY, z: posZ + 0.1, rot: 0},
        {x: posX + 2.5, y: posY, z: posZ + 0.5, rot: 0},
        {x: posX + 2.5, y: posY, z: posZ + 0.9, rot: 0},
        {x: posX + 2.5, y: posY, z: posZ + 1.3, rot: 0},
        {x: posX + 2.55, y: posY, z: posZ + 1.7, rot: 10}, // turn left
        {x: posX + 2.65, y: posY, z: posZ + 2.1, rot: 20},
        {x: posX + 2.8, y: posY, z: posZ + 2.5, rot: 25},
        {x: posX + 3.0, y: posY, z: posZ + 2.9, rot: 25},
        {x: posX + 3.2, y: posY, z: posZ + 3.3, rot: 25},
        {x: posX + 3.35, y: posY, z: posZ + 3.7, rot: 20},
        {x: posX + 3.45, y: posY, z: posZ + 4.1, rot: 10},
        {x: posX + 3.5, y: posY, z: posZ + 4.5, rot: 0},
        {x: posX + 3.5, y: posY, z: posZ + 4.9, rot: 0},
        {x: posX + 3.5, y: posY, z: posZ + 5.3, rot: 0},
        {x: posX + 3.40, y: posY, z: posZ + 5.7, rot: -10},
        {x: posX + 3.30, y: posY, z: posZ + 6.1, rot: -10},
        {x: posX + 3.20, y: posY, z: posZ + 6.5, rot: -10},
        {x: posX + 3.10, y: posY, z: posZ + 6.9, rot: -10},
        {x: posX + 3.0, y: posY, z: posZ + 7.3, rot: -10},
        {x: posX + 2.9, y: posY, z: posZ + 7.7, rot: -10},
        {x: posX + 2.8, y: posY, z: posZ + 8.1, rot: -10},
        {x: posX + 2.7, y: posY, z: posZ + 8.5, rot: -10},
        {x: posX + 2.6, y: posY, z: posZ + 8.9, rot: -10},
        {x: posX + 2.5, y: posY, z: posZ + 9.3, rot: -10},
        {x: posX + 2.5, y: posY, z: posZ + 9.7, rot: 0},
    ]

    for (let i = 0; i < dominoPositions.length; i++) {
        cube(dominoPositions[i], dominoSize, dominoPositions[i].rot , 'dominoPiece', 20, 0x303030, 0.3, 0.8)
    }

    if (starter){
        // Ball to start first domino:
        let ballPosition = {x: position.x + 0, y: position.y + 1, z: position.z - 5.6};
        rails(ballPosition, -90, -20, 1);
        // ball(ballPosition, 0.45, 0);

        ballPosition.y += 0.35;
        ballPosition.z -= 0.9;
        rails(ballPosition, -90, 0.5, 1);

        ballPosition.y += 0.5;
        ballPosition.z -= 0.5;
        ball(ballPosition, 0.3, 10);

        // Ball to end domino:
        ballPosition = {x: position.x + 0, y: position.y + 0, z: position.z + 5.2};
        rails(ballPosition, 90, -0.5, 1);

        ballPosition.y += 0.5;
        ballPosition.z += 0.3;
        ball(ballPosition, 0.3, 10, 0.7, 0.1);

        ballPosition.y -= 0.5;
        ballPosition.z += 0.7;
        rails(ballPosition, 90, 20, 1);
    }
}


export function plinko(position = {x: 14, y: 7.05, z: -30.5}) {


    // ball({x: position.x+4.5, y: position.y+4.5, z: position.z+5}, 0.20, 8)

    const boardValues = {x: 20, y: 0.2, z: 12};
    const pegValues = {x: 0.08, y: 0.04, z: 0.5};
    const fenceValues = {x: 0.2, y: 0.8, z: 13};
    const rampValues = {x: 0.2, y: 0.8, z: 20};
    const topFrameValues = {x: 20.01, y: 0.8, z: 0.2};
    const sideFrameValues = {x: 0.8, y: 0.4, z: 9.28};
    const backFrameValues = {x: 0.8, y: 8.5, z: 0.8};
    const frontBottomFrameValues = {x: 20.01, y: 0.4, z: 0.2};

    const orangeColor = new THREE.MeshStandardMaterial({color: 0xF47004, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.5});
    const brownColor = new THREE.MeshStandardMaterial({color: 0xBC6A00,  side: THREE.DoubleSide, roughness: 0.3});
    const blackColor = new THREE.MeshStandardMaterial({color: 0x000500,  side: THREE.DoubleSide, roughness: 0.3, metalness: 0.8});

    const plinkoMesh = new THREE.Group();
    plinkoMesh.position.set(position.x, position.y, position.z);
    plinkoMesh.rotateY(90*Math.PI/180);
    plinkoMesh.rotateX(-45*Math.PI/180);
    const plinkoShape = new Ammo.btCompoundShape();

    const boardGeo = new THREE.BoxGeometry(boardValues.x, boardValues.y, boardValues.z);
    const plinkoBoard = createAmmoMesh('box', boardGeo, boardValues, {x:-5, y: 0, z:0}, {x: 0, y: 0, z: 0}, orangeColor, plinkoMesh, plinkoShape);

    const fenceGeo = new THREE.BoxGeometry(fenceValues.x, fenceValues.y, fenceValues.z);
    const fence = createAmmoMesh('box', fenceGeo, fenceValues, {x:0.2, y: 0.4, z: 1.2}, {x: 0, y: -45*Math.PI/180, z: 0}, brownColor, plinkoMesh, plinkoShape);
    const secondFence = createAmmoMesh('box', fenceGeo, fenceValues, {x:-10.2, y: 0.4, z: 1.2}, {x: 0, y: 45*Math.PI/180, z: 0}, brownColor, plinkoMesh, plinkoShape);

    const rampGeo = new THREE.BoxGeometry(rampValues.x, rampValues.y, rampValues.z);
    const ramp = createAmmoMesh('box', rampGeo, rampValues, {x:-5.05, y: 0.4, z: -4.65}, {x: 0, y: 83*Math.PI/180, z: 0}, brownColor, plinkoMesh, plinkoShape);

    const topFrameGeo = new THREE.BoxGeometry(topFrameValues.x, topFrameValues.y, topFrameValues.z);
    const topFrame = createAmmoMesh('box', topFrameGeo, topFrameValues, {x: -5, y: -0.24, z: 6.206}, {x: -45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);

    const frontBottomFrameGeo = new THREE.BoxGeometry(frontBottomFrameValues.x, frontBottomFrameValues.y, frontBottomFrameValues.z);
    const bottomFrontFrame = createAmmoMesh('box', frontBottomFrameGeo, frontBottomFrameValues, {x: -5, y: -0.075, z: -6.075}, {x: -135*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);

    const bottomFrameGeo = new THREE.BoxGeometry(sideFrameValues.x, sideFrameValues.y, sideFrameValues.z);
    const bottomLeftFrame = createAmmoMesh('box', bottomFrameGeo, sideFrameValues, {x: 4.602, y: -3.3, z: -2.85}, {x: 45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);
    const bottomRightFrame = createAmmoMesh('box', bottomFrameGeo, sideFrameValues, {x: -14.602, y: -3.3, z: -2.85}, {x: 45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);

    const backFrameGeo = new THREE.BoxGeometry(backFrameValues.x, backFrameValues.y, backFrameValues.z);
    const backLeftFrame = createAmmoMesh('box', backFrameGeo, sideFrameValues, {x: 4.602, y: -3.2, z: 3.245}, {x: 45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);
    const backRightFrame = createAmmoMesh('box', backFrameGeo, sideFrameValues, {x: -14.602, y: -3.2, z: 3.245}, {x: 45*Math.PI/180, y: 0, z: 0}, brownColor, plinkoMesh, plinkoShape);

    const pegGeo = new THREE.CylinderGeometry(pegValues.x, pegValues.y, pegValues.z, 36, 1);

    let x = -5;
    let y = 0;
    let count = 1;
    for (let i = 0; i < 18; i++){
        for (let j = 0; j < count; j++) {
            let peg = createAmmoMesh('cylinder', pegGeo, pegValues, {x: x+j, y: 0.4, z: 5.5+y}, {x: 0, y: 0, z: 0}, blackColor, plinkoMesh, plinkoShape);

        }
        count +=1
        x += -0.5;
        y += -0.5;
    }

    createAmmoRigidBody(plinkoShape, plinkoMesh, 1, 1, plinkoMesh.position, 0);

    const tableSize = {x: 12, y: 0.05, z: 22};
    const table = new THREE.Group();
    table.position.set(position.x+0.5, position.y-4.6, position.z+5);
    const tableShape = new Ammo.btCompoundShape();

    tableMesh(table, tableShape, tableSize, {x: 0, y: 0, z: 0}, position.y-4.6, 'plinkoTable',  0x823c17);

    ri.scene.add(table);
    ri.scene.add(plinkoMesh);
}


export function golfclub(position = {x: -40, y: 16.51, z: 40}) { //{x: 40, y: 16.51, z: 40}
    const rotation = -90
    const handleBarValues = {x: 0.2, y: 0.1, z: 4};
    const shaftValues = {x: 0.1, y: 0.1, z: 10};
    const connectorValues = {x: 0.15, y: 0.15, z: 0.4};
    const clubValues = {x: 0.3, y: 0.5, z: 1.5};

    const lightGreyColor = new THREE.MeshStandardMaterial({color: 0xFCFCFF, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.5});
    const brownColor = new THREE.MeshStandardMaterial({color: 0xBC6A00,  side: THREE.DoubleSide, roughness: 0.3});
    const blackColor = new THREE.MeshStandardMaterial({color: 0x000500,  side: THREE.DoubleSide, roughness: 0.3});

    let golfClubMesh = new THREE.Group();
    golfClubMesh.position.set( position.x, position.y, position.z);
    golfClubMesh.rotateY(rotation * Math.PI/180);
    golfClubMesh.rotateZ(46.8 * Math.PI/180);

    let golfClubShape = new Ammo.btCompoundShape();

    let handleBarGeo = new THREE.CylinderGeometry(handleBarValues.x, handleBarValues.y, handleBarValues.z, 36, 1);
    let handleBar = createAmmoMesh('cylinder', handleBarGeo, handleBarValues, {x: 0, y: 7, z: 0}, {x: 0, y: 0, z: 0}, blackColor, golfClubMesh, golfClubShape);
    let shaftGeo = new THREE.CylinderGeometry(shaftValues.x, shaftValues.y, shaftValues.z, 36, 1);
    let shaft = createAmmoMesh('cylinder', shaftGeo, handleBarValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, lightGreyColor, golfClubMesh, golfClubShape);
    let connectorGeo = new THREE.CylinderGeometry(connectorValues.x, connectorValues.y, connectorValues.z, 36, 1);
    let connector = createAmmoMesh('cylinder', connectorGeo, connectorValues, {x: 0, y: -5, z: 0}, {x: 0, y: 0, z: 0}, blackColor, golfClubMesh, golfClubShape);
    let clubGeo = new THREE.BoxGeometry(clubValues.x, clubValues.y, clubValues.z);
    let club = createAmmoMesh('box', clubGeo, clubValues, {x: 0, y: -5.4, z: 0.6}, {x: 0, y: 0, z: 0}, lightGreyColor, golfClubMesh, golfClubShape);

    let golfClubRigid = createAmmoRigidBody(golfClubShape, golfClubMesh, 0, 0, golfClubMesh.position, 2);


    let golfClubStandMesh = new THREE.Group();
    golfClubStandMesh.position.set( position.x, position.y, position.z);
    golfClubStandMesh.rotateY(rotation * Math.PI/180); // ?
    let golfClubStandShape = new Ammo.btCompoundShape();

    let hingeValues = {x: 0.4, y: 0.4, z: 8};
    let LegValues = {x: 1.4, y: 17, z: 1.4};
    let topBarValues = {x: 0.4, y: 0.4, z: 6};
    let stopperHingeValues = {x: 0.1, y: 0.1, z: 1};

    let hingeGeo = new THREE.CylinderGeometry(hingeValues.x, hingeValues.y, hingeValues.z, 36, 1);
    let hinge = createAmmoMesh('cylinder', hingeGeo, hingeValues, {x: 0, y: 0, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, lightGreyColor, golfClubStandMesh, golfClubStandShape);
    let leftLegGeo = new THREE.BoxGeometry(LegValues.x, LegValues.y, LegValues.z);
    let leftLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 0, y: -8, z: -4}, {x: 0, y: 0, z: 0}, brownColor, golfClubStandMesh, golfClubStandShape);
    let rightLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 0, y: -8, z: 4}, {x: 0, y: 0, z: 0}, brownColor, golfClubStandMesh, golfClubStandShape);
    let backLeftLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 6, y: -8, z: -4}, {x: 0, y: 0, z: 0}, brownColor, golfClubStandMesh, golfClubStandShape);
    let backRightLeg = createAmmoMesh('box', leftLegGeo, LegValues, {x: 6, y: -8, z: 4}, {x: 0, y: 0, z: 0}, brownColor, golfClubStandMesh, golfClubStandShape);
    let topBarGeo = new THREE.CylinderGeometry(topBarValues.x, topBarValues.y, topBarValues.z, 36, 1);
    let topLeftBar = createAmmoMesh('cylinder', topBarGeo, topBarValues, {x: 2.5, y: 0, z: -4}, {x: 0, y: 0, z: 90*Math.PI/180}, lightGreyColor, golfClubStandMesh, golfClubStandShape);
    let topRightBar = createAmmoMesh('cylinder', topBarGeo, topBarValues, {x: 2.5, y: 0, z: 4}, {x: 0, y: 0, z: 90*Math.PI/180}, lightGreyColor, golfClubStandMesh, golfClubStandShape);
    let stopperHingeGeo = new THREE.CylinderGeometry(stopperHingeValues.x, stopperHingeValues.y, stopperHingeValues.z, 36, 1);
    let stopperLeftHinge = createAmmoMesh('cylinder', stopperHingeGeo, stopperHingeValues, {x: 7, y: -7.5, z: -4}, {x: 0, y: 0, z: 90*Math.PI/180}, lightGreyColor, golfClubStandMesh, golfClubStandShape);
    let stopperRightHinge = createAmmoMesh('cylinder', stopperHingeGeo, stopperHingeValues, {x: 7, y: -7.5, z: 4}, {x: 0, y: 0, z: 90*Math.PI/180}, lightGreyColor, golfClubStandMesh, golfClubStandShape);

    let golfClubStandRigid = createAmmoRigidBody(golfClubStandShape, golfClubStandMesh, 0, 1, golfClubStandMesh.position, 0);
    golfClubStandRigid.setActivationState(4);
    //Benyttet kode eksempler utgitt av Werner Farstad. Hentet fra https://source.coderefinery.org/3d/threejs23_std/-/blob/main/src/modul7/ammoConstraints/armHingeConstraint.js?ref_type=heads
    let pivotStand = new Ammo.btVector3(0, 0, 0);
    let axisStand = new Ammo.btVector3(0, 0, 1);
    let pivotClub = new Ammo.btVector3(0, 9.35, 0);
    let axisClub = new Ammo.btVector3(0, 0, 1);
    let ClubHinge = new Ammo.btHingeConstraint(golfClubStandRigid, golfClubRigid, pivotStand, pivotClub, axisStand, axisClub, false);
    ClubHinge.setLimit(-Math.PI/2, Math.PI/2, 1, 1, 1);
    ClubHinge.enableAngularMotor(true, 0, 0.04);
    phy.ammoPhysicsWorld.addConstraint(ClubHinge, true);

    let golfClubStopperMesh = new THREE.Group();
    golfClubStopperMesh.position.set(position.x, position.y -7, position.z + 7);
    golfClubStopperMesh.rotateY(rotation * Math.PI/180); // ?
    let golfClubStopperShape = new Ammo.btCompoundShape();
    let stopperValues = {x: 0.2, y: 0.2, z: 10};
    let stopperGeo = new THREE.CylinderGeometry(stopperValues.x, stopperValues.y, stopperValues.z, 36, 1);
    let stopper = createAmmoMesh('cylinder', stopperGeo, stopperValues, {x: 0, y: 0, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, lightGreyColor, golfClubStopperMesh, golfClubStopperShape);
    let golfClubStopperRigid = createAmmoRigidBody(golfClubStopperShape, golfClubStopperMesh, 0, 1, golfClubStopperMesh.position, 0.3);

    ri.scene.add(golfClubStopperMesh);
    ri.scene.add(golfClubStandMesh);
    ri.scene.add(golfClubMesh);

    let ballPosition = {x: position.x, y: position.y-15.5, z: position.z};
    let ballRadius = 1
    let ballMass = 0.1
    ball(ballPosition, ballRadius, ballMass);
}


export function cannon() {
    //Benyttet kode eksempler utgitt av Werner Farstad. Hentet fra: https://source.coderefinery.org/3d/threejs23_std/-/blob/main/src/modul7/ammoConstraints/springGeneric6DofSpringConstraint.js?ref_type=heads
    let position = {x: 45, y: 3.76, z: 40}; //x: 47, y: 3.76, z: 20
    let rotationDegree =60*Math.PI/180;
    let rotationAxis = 'Z';
    let bottomSpringValues = {x: 0.45, y: 0.45, z: 0.2};
    let topSpringValues = {x: 0.45, y: 0.45, z: 0.2};

    const lightGreyColor = new THREE.MeshStandardMaterial({color: 0xFCFCFF, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.5});
    const brownColor = new THREE.MeshStandardMaterial({color: 0xBC6A00,  side: THREE.DoubleSide, roughness: 0.3});
    const blackColor = new THREE.MeshStandardMaterial({color: 0x000500,  side: THREE.DoubleSide, roughness: 0.3, metalness: 0.8});

    let bottomSpringMesh = new THREE.Group();
    bottomSpringMesh.position.set(position.x, position.y ,position.z);
    bottomSpringMesh.name = 'cannon';

    if (rotationAxis == "Z")
    {bottomSpringMesh.rotateZ(rotationDegree)}
    else {bottomSpringMesh.rotateX(rotationDegree)};

    let bottomSpringShape = new Ammo.btCompoundShape();

    let bottomSpringGeo = new THREE.CylinderGeometry(bottomSpringValues.x, bottomSpringValues.y, bottomSpringValues.z, 36, 1);
    let bottomSpring = createAmmoMesh('cylinder', bottomSpringGeo, bottomSpringValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, lightGreyColor, bottomSpringMesh, bottomSpringShape);

    let topSpringMesh = new THREE.Group();
    topSpringMesh.position.set(position.x, position.y+0.1 ,position.z);
    if (rotationAxis == "Z")
    {topSpringMesh.rotateZ(rotationDegree)}
    else {topSpringMesh.rotateX(rotationDegree)};

    let topSpringShape = new Ammo.btCompoundShape();
    let topSpringGeo = new THREE.CylinderGeometry(topSpringValues.x, topSpringValues.y, topSpringValues.z, 36, 1);
    let topSpring2 = createAmmoMesh('cylinder', topSpringGeo, topSpringValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, blackColor, topSpringMesh, topSpringShape);

    let rigidTopSpring = createAmmoRigidBody(bottomSpringShape, bottomSpringMesh, 1, 1, bottomSpringMesh.position, 0);
    let rigidBottomSpring = createAmmoRigidBody(topSpringShape, topSpringMesh, 1, 1, topSpringMesh.position, 10);
    rigidTopSpring.setActivationState(4);
    rigidBottomSpring.setActivationState(4);

    let spring = new Ammo.btGeneric6DofSpringConstraint(rigidTopSpring, rigidBottomSpring, bottomSpring.transform, topSpring2.transform, false);
    spring.name = "cannonSpring";

    spring.setLinearLowerLimit(new Ammo.btVector3(0, 1, 0));
    spring.setLinearUpperLimit(new Ammo.btVector3(0, 0, 0));
    spring.setAngularLowerLimit(new Ammo.btVector3(0, 0, 0));
    spring.setAngularUpperLimit(new Ammo.btVector3(0, 0, 0));

    spring.enableSpring(1, false);
    spring.setStiffness(1, 8500);
    spring.setDamping(1, 100);
    spring.setEquilibriumPoint(1, 3);

    phy.ammoPhysicsWorld.addConstraint(spring, false);
    ri.springs.cannonSpring = spring;

    //cannonbody LatheGeometry
    let cannonBodyShape = new Ammo.btCompoundShape();

    let material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide,
        metalness: 0.4,
        roughness: 0.3});


    let height = 8;
    let radius = 0.5;
    let points = [
        new THREE.Vector2(radius, height*0.1),
        new THREE.Vector2(radius, height*1),
        new THREE.Vector2(radius*1.8, height*1),
        new THREE.Vector2(radius*1.8, height*0.9),
        new THREE.Vector2(radius*1.8, height*0.9),
        new THREE.Vector2(radius*1.5, height*0.9),
        new THREE.Vector2(radius*1.5, height*0.5),
        new THREE.Vector2(radius*2, height*0.1),

    ];

    let cannonBodyShapeGeo = new THREE.LatheGeometry(points, 128, 0, 2 * Math.PI);
    let cannonBodyMesh = new THREE.Mesh(cannonBodyShapeGeo, material);

    if (rotationAxis == "Z")
    {cannonBodyMesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationDegree)}
    else {cannonBodyMesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationDegree)};

    cannonBodyMesh.name = 'cannonBody';
    cannonBodyMesh.castShadow = true;
    cannonBodyMesh.receiveShadow = true;

    cannonBodyMesh.material.transparent = true;
    cannonBodyMesh.material.opacity = 0.6;


    createAmmoMesh('triangleShape', cannonBodyShapeGeo, cannonBodyMesh, {x: 0, y: -1.5, z: 0}, {x: 0, y: 0, z: 0}, blackColor, bottomSpringMesh, cannonBodyShape, 'cannonBody')
    cannonBodyMesh.collisionResponse = (mesh1) => {
        ri.springs.cannonSpring.enableSpring(1, true);
        console.log("im here")

    };
    createAmmoRigidBody(cannonBodyShape, cannonBodyMesh, 0.4, 0.6, {x: position.x, y: position.y, z: position.z}, 0);

    //cannonEnd
    let cannonEndValues = {radius: 1, segments: 32}
    let cannonEndGeo = new THREE.SphereGeometry(cannonEndValues.radius, cannonEndValues.segments, cannonEndValues.segments, 0 , Math.PI);
    let cannonEnd = createAmmoMesh('sphere', cannonEndGeo, cannonEndValues, {x: 0, y: -0.5, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, blackColor, bottomSpringMesh, bottomSpringShape);

    //cannonStand
    let cannonStandMesh = new THREE.Group();
    cannonStandMesh.position.set(position.x, position.y ,position.z);
    cannonStandMesh.rotateY(90*Math.PI/180);

    if (rotationAxis == "Z")
    {cannonStandMesh.rotateY(0*Math.PI/180);}
    else {cannonStandMesh.rotateY(90*Math.PI/180);};

    let cannonStandShape = new Ammo.btCompoundShape();
    let cannonStandValues = {x: 0.4, y: 4.5, z: 2};
    let cannonStandBottomValues = {x: 0.4, y: 2.8, z: 2};
    let axisStandValues = {x: 0.2, y: 0.2, z: 0.3};
    let cannonStandGeo = new THREE.BoxGeometry(cannonStandValues.x, cannonStandValues.y, cannonStandValues.z);
    let cannonStandBottomGeo = new THREE.BoxGeometry(cannonStandBottomValues.x, cannonStandBottomValues.y, cannonStandBottomValues.z);
    let leftLeg = createAmmoMesh('box', cannonStandGeo, cannonStandValues, {x: -1.2, y: -1.5, z: 0}, {x: 0, y: 0, z: 0}, brownColor, cannonStandMesh, cannonStandShape);
    let rightLeg = createAmmoMesh('box', cannonStandGeo, cannonStandValues, {x: 1.2, y: -1.5, z: 0}, {x: 0, y: 0, z: 0}, brownColor, cannonStandMesh, cannonStandShape);
    let standBottom = createAmmoMesh('box', cannonStandBottomGeo, cannonStandBottomValues, {x: 0, y: -3.55, z: 0}, {x: 0, y: 0, z: 90*Math.PI/180}, brownColor, cannonStandMesh, cannonStandShape);
    let axisGeo = new THREE.CylinderGeometry(axisStandValues.x, axisStandValues.y, axisStandValues.z, 36, 1);
    let leftAxis = createAmmoMesh('cylinder', axisGeo, axisStandValues, {x: -1.35, y: 0, z: 0}, {x: 0, y: 0, z: 90*Math.PI/180}, blackColor, cannonStandMesh, cannonStandShape)
    let rightAxis = createAmmoMesh('cylinder', axisGeo, axisStandValues, {x: 1.35, y: 0, z: 0}, {x: 0, y: 0, z: 90*Math.PI/180}, blackColor, cannonStandMesh, cannonStandShape)


    ri.scene.add(bottomSpringMesh);
    ri.scene.add(topSpringMesh);
    ri.scene.add(cannonStandMesh);

    let ballPosition = {x: position.x, y: position.y+1, z: position.z+1};
    if (rotationAxis == "Z")
    {ballPosition = {x: position.x-2, y: position.y+1, z: position.z};}
    else {ballPosition = {x: position.x, y: position.y+0.2, z: position.z+1};};
    let ballRadius = 0.45
    let ballMass = 20
    ball(ballPosition, ballRadius, ballMass, 0.7, 0.8, 'cannonBall');
    ball({x: position.x-3.5, y: position.y+2.5, z: position.z-2.5}, ballRadius, ballMass, 0.7, 0.8);
    rails({x: position.x-3.5, y: position.y+1.5, z: position.z-3}, 90, 20, 2, true, 1);

}


export function cannonTarget() {

    const targetTexture = new THREE.MeshStandardMaterial({map: ri.textures.target,  side: THREE.DoubleSide});

    let position = {x: -20, y: 25.2, z: 40}; //x: 45, y: 25, z: 20
    let targetMesh = new THREE.Group();
    targetMesh.rotateY(-90*Math.PI/180);
    targetMesh.position.set(position.x, position.y ,position.z);
    targetMesh.name = 'target'

    let targetShape = new Ammo.btCompoundShape();

    let targetValues = {x: 5, y: 5, z: 0.5}
    let targetGeo = new THREE.CylinderGeometry(targetValues.x, targetValues.y, targetValues.z, 36, 1);
    let target = createAmmoMesh('cylinder', targetGeo, targetValues, {x: 0, y: 0, z: 0}, {x: 90*Math.PI/180, y: 0, z: 0}, targetTexture, targetMesh, targetShape)

    targetMesh.collisionResponse = (mesh1) => {
        ri.springs.cannonSpring.setDamping(1, 0);

    };
    let targetBody = createAmmoRigidBody(targetShape, targetMesh, 0, 0.6, {x: position.x, y: position.y, z: position.z}, 0);
    position.y -= 10
    position.x += 3
    funnel(position, 7, 0.5, 4);

    let railPosition = {x: position.x+1.5 , y: position.y -1 , z: position.z-0.5 };
    rails(railPosition, 21, 15, 21, true, 0);

    ri.scene.add(targetMesh);

}


export function newtonCradle() {
    const materialDarkGrey = new THREE.MeshStandardMaterial({map: ri.textures.darkGrey, side: THREE.DoubleSide});
    const transparent = new THREE.MeshStandardMaterial({map: ri.textures.darkGrey, side: THREE.DoubleSide});
    const colorGrey = new THREE.MeshStandardMaterial({color: 0xffffff, side: THREE.DoubleSide});

    let topBoxValues = {x: 0.25, y: 0.25, z: 5};
    let bottomBoxConnectorValues = {x: 2, y: 0.25, z: 0.25};
    let riserBoxValues = {x: 0.25, y: 4, z: 0.25};
    let ballValues = {radius: 0.3, segments: 32};
    let cradleMeshPosition = {x: 0, y: -0.5, z: 0};
    let cradleMesh = new THREE.Group();
    cradleMesh.name = "cradleMesh";
    cradleMesh.position.set( cradleMeshPosition.x, cradleMeshPosition.y, cradleMeshPosition.z);
    let cradleTopBarPosition1 = {x: 1, y: 6-0.125, z: 0};
    let cradleTopBarPosition2 = {x: -1, y: 6-0.125, z: 0};
    let cradleShape = new Ammo.btCompoundShape();

    let cradleBottomGeo = new THREE.BoxGeometry(topBoxValues.x, topBoxValues.y, topBoxValues.z);

    //let cradleConnectorGeo = new THREE.BoxGeometry(bottomBoxConnectorValues.x, bottomBoxConnectorValues.y, bottomBoxConnectorValues.z);
    //let cradleConnectorBar1 = createAmmoMesh('box', cradleConnectorGeo, bottomBoxConnectorValues, {x: 0, y: 2+0.125, z: 2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    //let cradleConnectorBar2 = createAmmoMesh('box', cradleConnectorGeo, bottomBoxConnectorValues, {x: 0, y: 2+0.125, z: -2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);

    let cradleRiserGeo = new THREE.BoxGeometry(riserBoxValues.x, riserBoxValues.y, riserBoxValues.z);
    let cradleRiserBar1  = createAmmoMesh('box', cradleRiserGeo, riserBoxValues, {x: 1, y: 4, z: 2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleRiserBar2  = createAmmoMesh('box', cradleRiserGeo, riserBoxValues, {x: 1, y: 4, z: -2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleRiserBar3  = createAmmoMesh('box', cradleRiserGeo, riserBoxValues, {x: -1, y: 4, z: 2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleRiserBar4  = createAmmoMesh('box', cradleRiserGeo, riserBoxValues, {x: -1, y: 4, z: -2.5}, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape);
    let cradleTopBar1 = createAmmoMesh('box', cradleBottomGeo, topBoxValues, cradleTopBarPosition1, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape, "cradleTopBar1");
    let cradleTopBar2 = createAmmoMesh('box', cradleBottomGeo, topBoxValues, cradleTopBarPosition2, {x: 0, y: 0, z: 0}, materialDarkGrey, cradleMesh, cradleShape, "cradleTopBar2");

    ri.scene.add(cradleMesh);
    let cradleRigid = createAmmoRigidBody(cradleShape, cradleMesh, 0.1, 1, cradleMesh.position, 0);

    let ballShape = new Ammo.btCompoundShape();

    let ballList = [];

    let anchorShape = new Ammo.btCompoundShape()
    let anchorSize = {x: 0.1, y: 0.1, z: 0.1};
    let anchorGeo = new THREE.BoxGeometry(anchorSize.x,anchorSize.y,anchorSize.z);
    let ballGeo = new THREE.SphereGeometry(ballValues.radius, ballValues.segments, ballValues.segments);
    let ballPosition = ballValues.radius * 7;
    for (let i = 0; i < 8; ++i) {
        let anchor1Mesh = new THREE.Group();
        anchor1Mesh.name = "anchor1Mesh" + i;
        let anchor1 = createAmmoMesh('box', anchorGeo, anchorSize, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, anchor1Mesh, anchorShape);
        let anchor1Body = createAmmoRigidBody(anchorShape, anchor1Mesh, 0, 1, {x: cradleMeshPosition.x - 1, y: cradleMeshPosition.y+6-0.125, z: cradleMeshPosition.z + ballPosition}, 0);
        ri.scene.add(anchor1Mesh);

        let anchor2Mesh = new THREE.Group();
        anchor2Mesh.name = "anchor2Mesh" + i;
        let anchor2 = createAmmoMesh('box', anchorGeo, anchorSize, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, anchor2Mesh, anchorShape);
        let anchor2Body = createAmmoRigidBody(anchorShape, anchor2Mesh, 0, 1, {x: cradleMeshPosition.x + 1, y: cradleMeshPosition.y + 6-0.125, z: ballPosition}, 0);
        ri.scene.add(anchor2Mesh);

        let ballMesh = new THREE.Group();
        ballList[i] = new THREE.Group();
        ballList[i].name = "ball" + i + "Mesh";
        let ball = createAmmoMesh('sphere', ballGeo, ballValues, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, transparent, ballList[i], ballShape, ballList[i].name);
        let ballBody;

        if (i === 7) {
            ballBody = createAmmoRigidBody(ballShape, ballList[i], 0.97, 0.0, {
                x: cradleMeshPosition.x,
                y: cradleMeshPosition.y + 3 - 0.125,
                z: cradleMeshPosition.z + ballPosition
            }, 1);
            ballBody.setActivationState(4);
            //ballBody.applyCentralImpulse(new Ammo.btVector3(0, 0, -30));
        } else if (i === 0){
            ballBody = createAmmoRigidBody(ballShape, ballList[i], 0.97, 0.0, {
                x: cradleMeshPosition.x,
                y: cradleMeshPosition.y + 3 - 0.125,
                z: cradleMeshPosition.z + ballPosition
            }, 1);
            ballBody.setActivationState(4);
        } else {
            ballBody = createAmmoRigidBody(ballShape, ballList[i], 0.97,0.0, {
                    x: cradleMeshPosition.x,
                    y: cradleMeshPosition.y + 3 - 0.125,
                    z: cradleMeshPosition.z + ballPosition},
                1);
            ballBody.setActivationState(4);
        }

        ri.scene.add(ballList[i]);

        let anchorPivot = new Ammo.btVector3(1, 0, 0);
        let ballPivot = new Ammo.btVector3(0, 3, 0);

        let axis = new Ammo.btVector3(1, 0, 0);
        let hinge = new Ammo.btHingeConstraint(anchor1Body, ballBody, anchorPivot, ballPivot, axis, axis, false);
        hinge.setLimit(-Math.PI/2, Math.PI/2, 0.9, 0.3, 1);
        hinge.enableAngularMotor(false, 0, 0);
        phy.ammoPhysicsWorld.addConstraint(hinge, true);

        addLineBetweenObjects("anchor1Mesh" + i, "cradleMesh", {x: 0, y: 0, z: ballPosition}, {x: 0, y: 0, z: ballPosition}, cradleTopBar1.mesh.name, "lineToTopBar1_" + i);
        addLineBetweenObjects("anchor2Mesh" + i, "cradleMesh", {x: 0, y: 0, z: ballPosition}, {x: 0, y: 0, z: ballPosition}, cradleTopBar2.mesh.name, "lineToTopBar2_" + i);

        //let anchorWorldPivot = localToWorld(anchor1Body, anchorPivot);
        //let ballWorldPivot = localToWorld(ballBody, ballPivot);
        //let anchorPivotMarker = createPivotMarker(anchorWorldPivot, 0x00ffff);
        //let ballPivotMarker = createPivotMarker(ballWorldPivot);
        //anchorPivotMarker.name = "anchorMarker_" + i;
        //ballPivotMarker.name = "ballMarker_" + i;
        //ri.scene.add(anchorPivotMarker);
        //ri.scene.add(ballPivotMarker);

        ballPosition = ballPosition - (ballValues.radius * 2);
    }

    // Testing av cradle physics
    // let railPosition = {
    //     x: cradleMesh.position.x,
    //     y: cradleTopBar1.mesh.position.y - 5.3,
    //     z: cradleMesh.position.z - 2.8
    // };
    // railPosition.z += 4;
    // console.log(railPosition);
    // rails(railPosition, 90, -20, 8);
    // rails(railPosition, -90, 0, 4);
    //
    // let testBallPosition = {
    //     x: railPosition.x,
    //     y: railPosition.y + 3,
    //     z: railPosition.z + 7,
    // };
    // ball(testBallPosition, 0.3, 1000);

}


export function spiral(angle = -Math.PI/8, position = {x: -10, y: 0.1, z: 10}, turns = 50, name = "spiral") {
    const numTurns = 70;
    const height = numTurns/8;
    const boxSize = 0.05;
    const radius = 0.5;
    let spiralMesh = new THREE.Group();
    spiralMesh.position.set(position.x, position.y, position.z);
    spiralMesh.rotation.set(0,-angle, angle);
    spiralMesh.name = name;

    let spiralMeshNoCollision = new THREE.Group();
    spiralMeshNoCollision.position.set(position.x, position.y, position.z);
    spiralMeshNoCollision.rotation.set(0,-angle, angle);
    spiralMeshNoCollision.name = name + "NoCollision";

    let cylinderMesh = new THREE.Group();
    cylinderMesh.position.set(position.x, position.y, position.z);
    cylinderMesh.rotation.set(0,-angle, angle);
    cylinderMesh.name = name + "Cylinder";
    let spiralShape = new Ammo.btCompoundShape();
    let cylinderShape = new Ammo.btCompoundShape();
    const materialDarkGrey = new THREE.MeshPhongMaterial({map: ri.textures.darkGrey, side: THREE.DoubleSide});
    const transparent = new THREE.MeshPhongMaterial({map: ri.textures.darkGrey, side: THREE.DoubleSide})
    const boxGeometry = new THREE.BoxGeometry(boxSize*10, boxSize, boxSize);
    const centerCylinderGeometry = new THREE.CylinderGeometry(radius/2, radius/2, numTurns/8, 32, 1, false);
    createAmmoMesh('cylinder', centerCylinderGeometry, {radius1: radius/2, radius2: radius/2, height: numTurns/5}, {x: 0, y: numTurns/15.5, z: 0}, {x: 0, y: 0, z: 0}, materialDarkGrey, cylinderMesh, cylinderShape, cylinderMesh.name + "Ammo");

    const totalSteps = numTurns * 20;
    const reducingAtStep = totalSteps - (numTurns * 2.3);
    const reductionPerStep = (boxSize * 10) / (numTurns * 2.3);
    let max = 0;
    for (let i = 0; i < (numTurns * 20) + 20; i++) {
        const spiralAngle = (i / 120) * Math.PI * 2;
        const x = radius * Math.cos(spiralAngle);
        let y;



        if (i === numTurns * 20) {
            max = (height / (numTurns * 20)) * i;
            y = max;
        } else if (i > numTurns * 20) {
            console.log(max)
            y = max;
        } else {
            y = (height / (numTurns * 20)) * i;
        }

        const z = radius * Math.sin(spiralAngle);
        const position = {x: x, y: y, z: z}
        const radialVector = new THREE.Vector3(x, 0, z);
        radialVector.normalize();

        let wallBoxHeight = boxSize * 10;

        if (i >= reducingAtStep) {
            const taperingOffset = (i - reducingAtStep) * reductionPerStep;
            wallBoxHeight = Math.max(0, wallBoxHeight - taperingOffset);
        }

        const remainingHeight = height - position.y;
        wallBoxHeight = Math.min(wallBoxHeight, remainingHeight);

        const wallBoxGeometry = new THREE.BoxGeometry(boxSize, wallBoxHeight * 2, boxSize);
        const wallBoxPosition = {
            x: position.x + radialVector.x * boxSize * 5,
            y: position.y + wallBoxHeight,
            z: position.z + radialVector.z * boxSize * 5
        };

        let wallBoxRotation = new THREE.Vector3(0, 0, 0);

        let wall;
        if (i > numTurns * 18) {
            wall = createAmmoMesh('box', wallBoxGeometry, {x: 0, y: 0, z: 0}, wallBoxPosition, wallBoxRotation, transparent, spiralMeshNoCollision, spiralShape, "", "quaternion_norm");
        } else {
            wall = createAmmoMesh('box', wallBoxGeometry, {x: 0, y: 1, z: 0}, wallBoxPosition, wallBoxRotation, transparent, spiralMesh, spiralShape, "", "quaternion_norm");
            wall.mesh.material.transparent = true;
            wall.mesh.material.opacity = 0.1;
        }


        let spiralStep = createAmmoMesh('box', boxGeometry, {x: 0, y: 0, z: 0}, {x: position.x, y: position.y, z: position.z}, {x: radialVector.x, y: radialVector.y, z: radialVector.z}, materialDarkGrey, spiralMesh, spiralShape, name + "Step" + i, "quaternion_norm");
    }
    let spiralBody = createAmmoRigidBody(spiralShape, spiralMesh, 1, 0.1, spiralMesh.position, 0);
    let cylinderBody = createAmmoRigidBody(cylinderShape, cylinderMesh, 1, 0.1, cylinderMesh.position, 0);
    //let stopBoxShape = new Ammo.btCompoundShape();
    //let stopBoxMesh = new THREE.Group();
    //let stopBoxGeometry = new THREE.BoxGeometry(0.5, 0.9, 0.05);
    //createAmmoMesh('box', stopBoxGeometry, {x: 0.5, y: 0.9, z: 0.05}, {x: -6.2, y: 8.4, z: 9.7}, {x: 0,y: Math.PI/6,z: 0}, materialDarkGrey, stopBoxMesh, spiralShape, "stopBox");
    //createAmmoRigidBody(stopBoxShape, stopBoxMesh, 0.1, 0, {x: 0, y: 0, z: 0}, 0);
    ri.scene.add(spiralMesh);
    ri.scene.add(spiralMeshNoCollision);
    ri.scene.add(cylinderMesh);
    //ri.scene.add(stopBoxMesh);
}

