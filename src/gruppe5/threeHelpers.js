import * as THREE from "three";
import GUI from "lil-gui";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {ri} from "./script.js";
import {moveRigidBody, rotateRigidBody} from "./movable.js";
import * as TWEEN from "@tweenjs/tween.js";


export function createThreeScene() {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    ri.renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
    ri.renderer.setSize(window.innerWidth, window.innerHeight);
    ri.renderer.shadowMap.enabled = true;
    ri.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    ri.scene = new THREE.Scene();
    ri.scene.background = new THREE.Color(0xe4f3f0);

    ri.lilGui = new GUI();

    ri.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    ri.camera.position.set( -15, 7, 15 );
    // ri.camera.position.set( -5, 10, -10 ); // Temp position

    ri.controls = new OrbitControls(ri.camera, ri.renderer.domElement);
}


export function onWindowResize() {
    ri.camera.aspect = window.innerWidth / window.innerHeight;
    ri.camera.updateProjectionMatrix();
    ri.renderer.setSize(window.innerWidth, window.innerHeight);
}


export function handleKeyUp(event) {
    ri.currentlyPressedKeys[event.code] = false;
}


export function handleKeyDown(event) {
    ri.currentlyPressedKeys[event.code] = true;
}


export function keyPresses() {
    if (ri.currentlyPressedKeys['KeyQ']) {
        ri.springs.cannonSpring.enableSpring(1, true);
    }
    const movableMesh = ri.scene.getObjectByName("movable");
    if (ri.currentlyPressedKeys['KeyA']) {	//A
        moveRigidBody(movableMesh,{x: -0.2, y: 0, z: 0});
    }
    if (ri.currentlyPressedKeys['KeyD']) {	//D
        moveRigidBody(movableMesh,{x: 0.2, y: 0, z: 0});
    }
    if (ri.currentlyPressedKeys['KeyW']) {	//W
        moveRigidBody(movableMesh,{x: 0, y: 0, z: -0.2});
    }
    if (ri.currentlyPressedKeys['KeyS']) {	//S
        moveRigidBody(movableMesh,{x: 0, y: 0, z: 0.2});
    }

    const spiral = ri.scene.getObjectByName("spiral");
    if (ri.currentlyPressedKeys['KeyT']) {
        // Create a quaternion for the incremental rotation
        let deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 80);

        // Multiply the spiral's current quaternion by the incremental rotation
        spiral.quaternion.multiply(deltaRotation);

        // Extract the Euler rotation from the updated quaternion if needed
        let eulerRotation = new THREE.Euler().setFromQuaternion(spiral.quaternion, 'XYZ');

        // Apply the rotation to the rigid body
        rotateRigidBody(spiral, eulerRotation);
    }

    const steps =  ri.scene.getObjectByName("steps");
    let stepsStarted = false
    if (ri.currentlyPressedKeys['KeyE']) {	//E
        if (!stepsStarted) {
            stepsStarted = true;
            steps.tween.start();}

    }
}


// Hentet fra kodeeksempel modul9/selectObject1
export function onDocumentTouchStart(event) {
    event.preventDefault();
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
    onDocumentMouseDown( event );
}


// Hentet fra kodeeksempel modul9/selectObject1
export function onDocumentMouseDown(event) {
    event.preventDefault();
    // Se: https://threejs.org/docs/index.html#api/en/core/Raycaster.
    // ri.mouse.x og y skal være NDC, dvs. ligge i området -1 til 1.   (normalized device coordinates)
    ri.mouse.x = (event.clientX / ri.renderer.domElement.clientWidth) * 2 - 1;
    ri.mouse.y = -(event.clientY / ri.renderer.domElement.clientHeight) * 2 + 1;

    // Ray/stråle fra klikkposisjon til kamera:
    ri.raycaster.setFromCamera(ri.mouse, ri.camera); // Raycaster

    let intersects = ri.raycaster.intersectObjects(ri.balls);

    // Sjekker om strålen treffer noen av objekene:
    if (intersects.length > 0) {
        //Endrer farge på det første objektet som er klikket på som strålen treffer:
        let ball = intersects[0].object
        ball.material.color.setHex(Math.random() * 0xffffff);

        // Can only click a ball 1 time
        if (ball.name === 'ball'){
            ball.userData.physicsBody.applyCentralImpulse( new Ammo.btVector3(0, 0, 3 ));
            ball.name = 'ball_'
        }
    }
}


export function renderCamera() {
    ri.renderer.render(ri.scene, ri.camera);
}


export function addLights() {
    ambientLight();
    directionalLight();
}


// Kode hentet fra oblig 3
function ambientLight() {
    ri.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    ri.ambientLight.visible = true;
    ri.scene.add(ri.ambientLight);

    // lilGui
    ri.ambientFolder = ri.lilGui.addFolder( 'Ambient Light' );
    ri.ambientFolder.close();
    ri.ambientFolder.add(ri.ambientLight, 'visible').name("On/Off");
    ri.ambientFolder.add(ri.ambientLight, 'intensity').min(0).max(1).step(0.01).name("Intensity");
    ri.ambientFolder.addColor(ri.ambientLight, 'color').name("Color");
}


// Kode hentet fra oblig 3
function directionalLight() {
    ri.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    ri.directionalLight.position.set(1, 40, 0);
    ri.directionalLight.castShadow = true;

    ri.directionalLight.shadow.mapSize.width = 1024;
    ri.directionalLight.shadow.mapSize.height = 1024;
    ri.directionalLight.shadow.camera.near = 0;
    ri.directionalLight.shadow.camera.far = 50;
    ri.directionalLight.shadow.camera.left = -50;
    ri.directionalLight.shadow.camera.right = 50;
    ri.directionalLight.shadow.camera.top = 50;
    ri.directionalLight.shadow.camera.bottom = -50;

    const directionalLightHelper = new THREE.DirectionalLightHelper(ri.directionalLight, 10, 0xff7777);
    const directionalLightCameraHelper = new THREE.CameraHelper(ri.directionalLight.shadow.camera)
    directionalLightHelper.visible = false;
    directionalLightCameraHelper.visible = false;

    ri.scene.add(ri.directionalLight);
    ri.scene.add(directionalLightHelper);
    ri.scene.add(directionalLightCameraHelper);

    // Add folder to lilGui
    ri.directionalFolder = ri.lilGui.addFolder('Directional Light');
    ri.directionalFolder.close();
    ri.directionalFolder.add(ri.directionalLight, 'visible').name("On/Off");

    ri.directionalFolder.add(directionalLightHelper, 'visible').name("Helper").onChange(value => {
        directionalLightCameraHelper.visible = value;
    });
    ri.directionalFolder.add(ri.directionalLight, 'intensity').min(0).max(1).step(0.01).name("Intensity");
    ri.directionalFolder.addColor(ri.directionalLight, 'color').name("Color");
}


// Kode og shader hentet fra kodeeksempel modul8/shaderMaterial5
export function water() {
    let position = {x: 0, y: -2, z: 0};
    let waterTexture = ri.textures.water;
    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping
    waterTexture.repeat.set(5,5);
    let noiseTexture = ri.textures.cloud;
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.repeat.set(5,5);

    let colorDebugObject = {}
    colorDebugObject.depthColor = '#186691';
    colorDebugObject.surfaceColor = '#9bd8ff';

    //Definerer ekstra uniform-variabler:
    ri.uniforms = {
        baseTexture: { type: "t", value: waterTexture },
        baseSpeed: { type: "f", value: 0.05 },
        noiseTexture: { type: "t", value: noiseTexture },
        noiseScale: { type: "f", value: 0.25 },
        alpha: { type: "f", value: 1.0 },

        uBigWavesElevation: { value: 0.7 },
        uBigWavesFrequency: { value: new THREE.Vector2(0.09, 0.1) },
        uTime: { value: 0 },
        uBigWavesSpeed: { value: 0.45 },
        uDepthColor: { value: new THREE.Color(colorDebugObject.depthColor) },
        uSurfaceColor: { value: new THREE.Color(colorDebugObject.surfaceColor) },
        uColorOffset: { value: 0.08 },
        uColorMultiplier: { value: 5 },

        uSmallWavesElevation: { value: 0.02 },
        uSmallWavesFrequency: { value: 3 },
        uSmallWavesSpeed: { value: 0.6 },
        uSmallIterations: { value: 2 },
    };

    let waterMaterial = new THREE.ShaderMaterial({
        uniforms: ri.uniforms,
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        side: THREE.DoubleSide,
        transparent: true
    });

    let geometry = new THREE.PlaneGeometry(200, 200, 512, 512)

    geometry.rotateX(-Math.PI/2);
    let waterMesh = new THREE.Mesh(geometry, waterMaterial);
    waterMesh.name = "myWater";
    waterMesh.position.set(position.x, position.y, position.z)
    ri.scene.add(waterMesh);


    ri.effectFolder = ri.lilGui.addFolder( 'Effekt' );
    ri.effectFolder.close();
    ri.effectFolder.add(waterMaterial.uniforms.baseSpeed, 'value').min(0).max(1).step(0.001).name('baseSpeed');
    ri.effectFolder.add(waterMaterial.uniforms.noiseScale, 'value').min(0).max(1).step(0.001).name('noiseScale');

    ri.waweFolder = ri.lilGui.addFolder( 'Bølger' );
    ri.waweFolder.close();
    ri.waweFolder.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'x').min(0).max(0.5).step(0.001).name('uBigWavesFrequencyX');
    ri.waweFolder.add(waterMaterial.uniforms.uBigWavesElevation, 'value').min(0).max(2).step(0.001).name('uBigWavesElevation');
    ri.waweFolder.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'y').min(0).max(0.5).step(0.001).name('uBigWavesFrequencyY');
    ri.waweFolder.add(waterMaterial.uniforms.uBigWavesSpeed, 'value').min(0).max(4).step(0.001).name('uBigWavesSpeed');

    ri.waweFolder.addColor(colorDebugObject, 'depthColor').onChange(() => { waterMaterial.uniforms.uDepthColor.value.set(colorDebugObject.depthColor) })
    ri.waweFolder.addColor(colorDebugObject, 'surfaceColor').onChange(() => { waterMaterial.uniforms.uSurfaceColor.value.set(colorDebugObject.surfaceColor) })

    ri.waweFolder.add(waterMaterial.uniforms.uSmallWavesElevation, 'value').min(0).max(1).step(0.001).name('uSmallWavesElevation')
    ri.waweFolder.add(waterMaterial.uniforms.uSmallWavesFrequency, 'value').min(0).max(30).step(0.001).name('uSmallWavesFrequency')
    ri.waweFolder.add(waterMaterial.uniforms.uSmallWavesSpeed, 'value').min(0).max(4).step(0.001).name('uSmallWavesSpeed')
    ri.waweFolder.add(waterMaterial.uniforms.uSmallIterations, 'value').min(0).max(5).step(1).name('uSmallIterations')
}


export function arrow(position = {x:0, y:10, z:0}) {
    // THREE
    let groupMesh = new THREE.Group();

    let width = 2;
    let height = 4;
    let depth = 0.3;

    let shape = new THREE.Shape();
    shape.moveTo( 0,0 );
    shape.lineTo(width/2, height/3);
    shape.lineTo(width/4, height/3);
    shape.lineTo(width/4, height);
    shape.lineTo(-width/4, height);
    shape.lineTo(-width/4, height/3);
    shape.lineTo(-width/2, height/3);

    const extrudeSettings = {
        depth: depth,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelOffset: 0.3,
        bevelSegments: 4
    };

    let geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
    let material = new THREE.MeshStandardMaterial({
        color: 0xd10000,
        metalness: 0.5,
        roughness: 0.3});
    let mesh = new THREE.Mesh(geometry, material);

    groupMesh.name = 'arrow';
    groupMesh.castShadow = true;
    groupMesh.receiveShadow = true;
    groupMesh.position.set(position.x, position.y, position.z);
    mesh.position.set(0, 0, -depth/2)
    groupMesh.add(mesh)

    ri.scene.add(groupMesh);

    let tween1 = new TWEEN.Tween({y: 0})
        .to({y: 3}, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .yoyo(true)
        .repeat(Infinity)
        .onUpdate(function (newPosition) {
            groupMesh.position.y = position.y + newPosition.y
        });

    let tween2 = new TWEEN.Tween({r:0})
        .to({r: 2 * Math.PI}, 6000)
        .repeat(Infinity)
        .onUpdate(function (newPosition) {
            groupMesh.rotation.set(0, newPosition.r, 0)
        });

    tween1.start();
    tween2.start();
}


//Helper for hinge
export function createPivotMarker(position, color = 0xff0000) {
    let geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32, 32);
    let material = new THREE.MeshBasicMaterial({ color: color });
    let marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.rotateZ(Math.PI / 2);
    return marker;
}

export function localToWorld(body, localPoint) {
    let worldTransform = body.getWorldTransform();
    let position = worldTransform.getOrigin();
    let orientation = worldTransform.getRotation();

    let localVec = new THREE.Vector3(localPoint.x(), localPoint.y(), localPoint.z());
    let quaternion = new THREE.Quaternion(orientation.x(), orientation.y(), orientation.z(), orientation.w());
    localVec.applyQuaternion(quaternion);

    localVec.add(new THREE.Vector3(position.x(), position.y(), position.z()));
    return localVec;
}


//Werner sin funksjon en gang i tida...
export function addLineBetweenObjects(nameMeshStart, nameMeshEnd, meshPositionStart, meshPositionEnd, childName, lineName) {
    ri.scene.updateMatrixWorld(true);
    let lineMeshStartPosition = ri.scene.getObjectByName(nameMeshStart);
    let lineMeshEndPosition = ri.scene.getObjectByName(nameMeshEnd).getObjectByName(childName);

    // Wire / Line:
    // Definerer Line-meshet (beståemde av to punkter):
    const lineMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 30 } );
    const points = [];
    // Finner start- og endepunktmesh:
    const startPoint = new THREE.Vector3();
    const endPoint = new THREE.Vector3();
    // NB! Bruker world-position:
    lineMeshStartPosition.getWorldPosition(startPoint);

    startPoint.set(startPoint.x, meshPositionEnd.y, meshPositionEnd.z);

    lineMeshEndPosition.getWorldPosition(endPoint);
    endPoint.set(endPoint.x, endPoint.y, meshPositionStart.z);

    points.push(startPoint);
    points.push(endPoint);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
    const springLineMesh = new THREE.Line( lineGeometry, lineMaterial );
    springLineMesh.name = lineName;
    // NB! Linemeshet legges til scene-objektet.
    ri.scene.add(springLineMesh);
}

export function updateLines() {
    for (let i = 1; i <= 8; ++i) {
        let ballMesh = ri.scene.getObjectByName("ball" + i + "Mesh");
        if (ballMesh && ballMesh.userData.physicsBody) {
            let ballPhysicsBody = ballMesh.userData.physicsBody;
            let ballMotionState = ballPhysicsBody.getMotionState();

            if (ballMotionState) {
                let ballTransform = new Ammo.btTransform();
                ballMotionState.getWorldTransform(ballTransform);
                let ballPosition = ballTransform.getOrigin();

                // Update the line connected to this ball
                let line1 = ri.scene.getObjectByName("lineToTopBar1_" + i);
                let line2 = ri.scene.getObjectByName("lineToTopBar2_" + i);
                if (line1) {
                    let points = line1.geometry.attributes.position.array;
                    points[0] = ballPosition.x();
                    points[1] = ballPosition.y();
                    points[2] = ballPosition.z();
                    line1.geometry.attributes.position.needsUpdate = true;
                }
                if (line2) {
                    let points = line2.geometry.attributes.position.array;
                    points[0] = ballPosition.x();
                    points[1] = ballPosition.y();
                    points[2] = ballPosition.z();
                    line2.geometry.attributes.position.needsUpdate = true;
                }

                Ammo.destroy(ballTransform);
            }
        }
    }
}
