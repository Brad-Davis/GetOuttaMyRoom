import Room from '../controls/room.js';
import * as THREE from 'three';

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
            width: 15,
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

        const backWall = this.createSurface('wall', {
            width: 10,
            height: 10,
            x: 0,
            y: 0,
            z: -35,
            rotX: 0,
            rotY: 0,
            rotZ: 0,
            texture: "night.jpg"
        });
        hallway.add(backWall);

        this.scene.add(hallway);
    }
}

export default Hallway;