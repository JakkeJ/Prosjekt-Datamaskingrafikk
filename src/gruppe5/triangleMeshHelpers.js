/**
 * Hentet fra kodeeksempel modul7/ammoAdvancedShapes2trianglemesh
 */


/**
 * Brukes til bevegelige objekter.
 * Kan kollidere med hverandre, men kollisjonsboksen vil være konveks.
 * @param compoundShape
 * @param mesh
 */
export function createConvexTriangleShapeAddToCompound(compoundShape, mesh) {
    let shape = generateTriangleShape(mesh, true);
    addToCompound(compoundShape, mesh, shape);
}

/**
 * Brukes til statiske objekter. Kan IKKE kollidere med hverandre.
 * @param compoundShape
 * @param mesh
 */
export function createTriangleShapeAddToCompound(compoundShape, mesh) {
    let shape = generateTriangleShape(mesh, false);
    addToCompound(compoundShape, mesh, shape);
}

/**
 * Setter transformasjon på shape-objektet tilvarende mesh-objektet.
 * Legger shape-objektet til compoundShape.
 * @param compoundShape
 * @param mesh
 * @param shape
 */
export function addToCompound(compoundShape, mesh, shape) {
    let shapeTrans = new Ammo.btTransform();
    shapeTrans.setIdentity();
    shapeTrans.setOrigin(new Ammo.btVector3(mesh.position.x,mesh.position.y,mesh.position.z));
    let quat = mesh.quaternion;
    shapeTrans.setRotation( new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w) );
    compoundShape.addChildShape(shapeTrans, shape);
}

/**
 * Oppretter og returnerer en btBvhTriangleMeshShape ELLER btConvexTriangleMeshShape og skalerer shapen i forhold til meshet.
 * MERK!
 * Rigid body-objekter basert på btBvhTriangleMeshShape kan ikke kollidere med hverandre.
 * Rigid body-objekter basert på btConvexTriangleMeshShape kan kollidere med hverandre, men har en konveks kollisjonsboks rundt seg.
 * @param mesh
 * @param useConvexShape
 * @returns {*}
 */
export function generateTriangleShape(mesh, useConvexShape) {
    let vertices = traverseModel(mesh);
    let ammoMesh = new Ammo.btTriangleMesh();
    for (let i = 0; i < vertices.length; i += 9)
    {
        let v1_x = vertices[i];
        let v1_y = vertices[i+1];
        let v1_z = vertices[i+2];

        let v2_x = vertices[i+3];
        let v2_y = vertices[i+4];
        let v2_z = vertices[i+5];

        let v3_x = vertices[i+6];
        let v3_y = vertices[i+7];
        let v3_z = vertices[i+8];

        let bv1 = new Ammo.btVector3(v1_x, v1_y, v1_z);
        let bv2 = new Ammo.btVector3(v2_x, v2_y, v2_z);
        let bv3 = new Ammo.btVector3(v3_x, v3_y, v3_z);

        ammoMesh.addTriangle(bv1, bv2, bv3);
    }

    let triangleShape;
    if (useConvexShape)
        triangleShape = new Ammo.btConvexTriangleMeshShape(ammoMesh, false);
    else
        triangleShape = new Ammo.btBvhTriangleMeshShape(ammoMesh, false);

    let threeScale = mesh.scale;
    triangleShape.setLocalScaling(new Ammo.btVector3(threeScale.x, threeScale.y, threeScale.z));
    return triangleShape;
}

/**
 * Traverserer meshet vertekser, inkludert barn, barnebarn osv. rekursivt.
 * @param mesh
 * @param modelVertices
 * @param scaleFactor
 * @returns {*[]}
 */
export function traverseModel(mesh, modelVertices=[], scaleFactor) {
    if (mesh) {
        if (mesh.geometry) {
            let tmpVertices = [... mesh.geometry.attributes.position.array];
            for (let i = 0; i < tmpVertices.length; i += 3) {
                tmpVertices[i] = tmpVertices[i] * mesh.scale.x;
                tmpVertices[i + 1] = tmpVertices[i + 1] * mesh.scale.y;
                tmpVertices[i + 2] = tmpVertices[i + 2] * mesh.scale.z;
            }
            //console.log('** ' + mesh.type + ' Geometry' + ' [' + String(mesh.scale.x) + ',' + String(mesh.scale.y) + ',' + String(mesh.scale.z) + ']');
            //console.log('mesh.scale: ' + mesh.scale.x + ', ' + mesh.scale.y + ', ' + mesh.scale.z);

            modelVertices.push(...tmpVertices);
        } else {
            //console.log('** ' + mesh.type + ' ****' + ' [' + String(mesh.scale.x) + ',' + String(mesh.scale.y) + ',' + String(mesh.scale.z) + ']');
        }
    }
    let parentScale = mesh.scale;
    mesh.children.forEach((childMesh, ndx) => {
        childMesh.scale.x = childMesh.scale.x * parentScale.x;
        childMesh.scale.y = childMesh.scale.y * parentScale.y;
        childMesh.scale.z = childMesh.scale.z * parentScale.z;
        traverseModel(childMesh, modelVertices, scaleFactor);
    });
    return modelVertices;
}
