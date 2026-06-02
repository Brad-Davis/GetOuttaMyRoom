import Room from '../controls/room.js';
import * as THREE from 'three';
import Door from '../items/door.js';
import cameraService from '../utils/cameraPresets.js';
import { KITCHEN_WORLD_Y } from './kitchenLayout.js';
import Mom from '../people/mom.js';

/** Door mesh size (see `door.js`). Back wall width matches bedroom/hallway doored wall. */
const KITCHEN_DOOR_HEIGHT = 4;
const DOOR_WALL_WIDTH = 12;
/** Slightly shrink door cutout horizontally so alpha hole matches the 2-unit door mesh. */
const DOOR_TEX_SCALE_X = 1.2;
const DOOR_TEX_OFFSET_X = 0.5 * (1 - DOOR_TEX_SCALE_X);

export { KITCHEN_WORLD_Y, KITCHEN_LENGTH, getKitchenCenter } from './kitchenLayout.js';

class Kitchen extends Room {
    constructor(scene) {
        super('Kitchen', {
            width: 20,
            height: 8,
            depth: 10,
            floorLevel: -3,
            ceilingLevel: 5,
            wallHeight: 1,
        });
        this.scene = scene;
        this.createKitchen();
        setTimeout(() => {
            cameraService.lookAtKitchen();
        }, 3000);
    }

    createKitchen() {
        const kitchen = new THREE.Group();
        kitchen.position.y = KITCHEN_WORLD_Y;
        this.kitchenGroup = kitchen;
        const kitchenLength = 15;
        const kitchenCenterZ = -this.config.depth / 2 - kitchenLength / 2;
        const halfW = this.config.width / 2;
        const wallH = this.config.height;

        const leftWall = this.createSurface('wall', {
            width: kitchenLength,
            height: wallH,
            x: -halfW/2,
            y: this.config.wallHeight,
            z: kitchenCenterZ,
            rotX: 0,
            rotY: Math.PI / 2,
            rotZ: 0,
            texture: 'wall.jpg',
            textureOptions: { repeat: { x: 1, y: 1 } }
        });
        kitchen.add(leftWall);

        const rightWall = this.createSurface('wall', {
            width: kitchenLength,
            height: wallH,
            x: halfW/2,
            y: this.config.wallHeight,
            z: kitchenCenterZ,
            rotX: 0,
            rotY: -Math.PI / 2,
            rotZ: 0,
            texture: 'wall.jpg',
            textureOptions: { repeat: { x: 1, y: 1 } }
        });

        // Same rot convention as bedroom floor: width = X, height = Z (no rotZ swap).
        const floor = this.createSurface('floor', {
            width: this.config.width,
            height: kitchenLength,
            x: 0,
            y: this.config.floorLevel,
            z: kitchenCenterZ,
            texture: 'floor.jpg',
            rotX: -Math.PI / 2,
            rotY: 0,
            rotZ: 0,
            textureOptions: { repeat: { x: 4, y: 4 } }
        });
        floor.frustumCulled = false;
        kitchen.add(floor);
        kitchen.add(rightWall);

        const ceiling = this.createSurface('ceiling', {
            width: this.config.width,
            height: kitchenLength,
            x: 0,
            y: this.config.ceilingLevel,
            z: kitchenCenterZ,
            texture: 'ceiling.jpg',
            rotX: Math.PI / 2,
            rotY: 0,
            rotZ: 0,
            textureOptions: { repeat: { x: 1, y: 1 } }
        });
        ceiling.frustumCulled = false;
        kitchen.add(ceiling);
        const backWallZ = kitchenCenterZ - kitchenLength / 2;
        const doorCenterY = this.config.floorLevel + KITCHEN_DOOR_HEIGHT / 2;

        const backWall = this.createSurface('wall', {
            width: DOOR_WALL_WIDTH,
            height: this.config.height,
            x: 0,
            y: this.config.wallHeight,
            z: backWallZ,
            rotX: 0,
            rotY: 0,
            rotZ: 0,
            texture: 'doorWall.png',
            alphaMap: 'dooredWall.jpg',
            textureOptions: {
                offset: { x: DOOR_TEX_OFFSET_X, y: 0 },
                repeat: { x: DOOR_TEX_SCALE_X, y: 0.785 },
            },
            alphaMapTextureOptions: {
                offset: { x: DOOR_TEX_OFFSET_X, y: 0 },
                repeat: { x: DOOR_TEX_SCALE_X, y: 0.8 },
            },
            alphaTest: 0.5,
        });

        const door = new Door(kitchen);
        door.createDoor(-1, doorCenterY, backWallZ + 1 );
        door.close();

        this.dadsRoomDoor = door;
        kitchen.add(backWall);



        this.scene.add(kitchen);

        const mom = new Mom(100, 1, 10, 10);
    
        kitchen.add(mom.model);
    }

    getDadsRoomDoor() {
        return this.dadsRoomDoor ?? null;
    }

}

export default Kitchen;
