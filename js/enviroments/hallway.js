import Room from '../controls/room.js';
import * as THREE from 'three';

/** Depth of the black mass along -Z — long enough you never “scroll through” it visually. */
export const HALLWAY_BLACK_DEPTH = 280;
/** Local Z of the face toward the room (same plane as the old back wall seal). */
export const HALLWAY_BLACK_FACE_LOCAL_Z = -30;

class Hallway extends Room {
    constructor(scene) {
        super('Hallway', {
            width: 10,
            height: 8,
            depth: 10,
            floorLevel: -3,
            ceilingLevel: 5,
            wallHeight: 1,
        });
        this.scene = scene;
        this.createHallway();
    }

    createHallway() {
        const hallway = new THREE.Group();

        const leftWall = this.createSurface('wall', {
            width: 20,
            height: 10,
            x: -2,
            y: 0,
            z: -15,
            rotX: 0,
            rotY: Math.PI / 2,
            rotZ: 0,
            texture: 'wall.jpg'
        });
        hallway.add(leftWall);

        const rightWall = this.createSurface('wall', {
            width: 20,
            height: 10,
            x: 2,
            y: 0,
            z: -15,
            rotX: 0,
            rotY: -Math.PI / 2,
            rotZ: 0,
            texture: 'wall.jpg'
        });

        const floor = this.createSurface('floor', {
            width: 20,
            height: 4,
            x: 0,
            y: -3,
            z: -15,
            texture: 'floor.jpg',
            rotX: -Math.PI / 2,
            rotY: 0,
            rotZ: Math.PI / 2,
        });
        hallway.add(floor);
        hallway.add(rightWall);

        const ceiling = this.createSurface('ceiling', {
            width: 20,
            height: 4,
            x: 0,
            y: 1.5,
            z: -15,
            texture: 'ceiling.jpg',
            rotX: Math.PI / 2,
            rotY: 0,
            rotZ: -Math.PI / 2,
        });
        hallway.add(ceiling);

        // Solid mass of darkness sealing the far end (not a lit plane — reads as void).
        const backDarkW = 22;
        const backDarkH = 14;
        const backDarkD = HALLWAY_BLACK_DEPTH;
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(backDarkW, backDarkH, backDarkD),
            new THREE.MeshBasicMaterial({
                color: 0x000000,
                depthWrite: true,
            })
        );
        // Front face stays at HALLWAY_BLACK_FACE_LOCAL_Z; bulk extends far into -Z.
        backWall.position.set(0, -0.85, HALLWAY_BLACK_FACE_LOCAL_Z - backDarkD * 0.5);
        hallway.add(backWall);

        this.scene.add(hallway);
    }
}

export default Hallway;