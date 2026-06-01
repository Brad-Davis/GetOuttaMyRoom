import Room from '../controls/room.js';
import * as THREE from 'three';
import Door from '../items/door.js';

/** Depth of Dad's room end cap along -Z — long enough you never scroll through it visually. */
export const DADS_ROOM_WALL_DEPTH = 280;
/** Local Z of the wall face toward the bedroom (hallway seal plane). */
export const DADS_ROOM_WALL_LOCAL_Z = -200;

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
        const hallLength = 2000;
        const hallCenterZ = -this.config.depth / 2 - hallLength / 2;
        const halfW = this.config.width / 2;
        const wallH = this.config.height;

        const leftWall = this.createSurface('wall', {
            width: hallLength,
            height: wallH,
            x: -halfW/2,
            y: this.config.wallHeight,
            z: hallCenterZ,
            rotX: 0,
            rotY: Math.PI / 2,
            rotZ: 0,
            texture: 'wall.jpg',
            textureOptions: { repeat: { x: 100, y: 1 } }
        });
        hallway.add(leftWall);

        const rightWall = this.createSurface('wall', {
            width: hallLength,
            height: wallH,
            x: halfW/2,
            y: this.config.wallHeight,
            z: hallCenterZ,
            rotX: 0,
            rotY: -Math.PI / 2,
            rotZ: 0,
            texture: 'wall.jpg',
            textureOptions: { repeat: { x: 100, y: 1 } }
        });

        // Same rot convention as bedroom floor: width = X, height = Z (no rotZ swap).
        const floor = this.createSurface('floor', {
            width: this.config.width,
            height: hallLength,
            x: 0,
            y: this.config.floorLevel,
            z: hallCenterZ,
            texture: 'floor.jpg',
            rotX: -Math.PI / 2,
            rotY: 0,
            rotZ: 0,
            textureOptions: { repeat: { x: 4, y: 400 } }
        });
        floor.frustumCulled = false;
        hallway.add(floor);
        hallway.add(rightWall);

        const ceiling = this.createSurface('ceiling', {
            width: this.config.width,
            height: hallLength,
            x: 0,
            y: this.config.ceilingLevel,
            z: hallCenterZ,
            texture: 'ceiling.jpg',
            rotX: Math.PI / 2,
            rotY: 0,
            rotZ: 0,
            textureOptions: { repeat: { x: 1, y: 100 } }
        });
        ceiling.frustumCulled = false;
        hallway.add(ceiling);

        // Floor under side intro / door2 (x ≈ -22) into the main corridor.
        const bridgeW = 22;
        const bridgeD = 18;
        const bridgeFloor = this.createSurface('floor', {
            width: bridgeW,
            height: bridgeD,
            x: -halfW - bridgeW / 2,
            y: this.config.floorLevel,
            z: -this.config.depth / 2 - bridgeD / 2,
            texture: 'floor.jpg',
            rotX: -Math.PI / 2,
            rotY: 0,
            rotZ: 0,
            textureOptions: { repeat: { x: 4, y: 4 } }
        });
        bridgeFloor.frustumCulled = false;
        hallway.add(bridgeFloor);

        const backWallZ = DADS_ROOM_WALL_LOCAL_Z - 10;
        const dadsRoomBacking = new THREE.Mesh(
            new THREE.PlaneGeometry(this.config.width, this.config.height),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        dadsRoomBacking.position.set(0, this.config.wallHeight, backWallZ - 1.5);
        dadsRoomBacking.frustumCulled = false;
        hallway.add(dadsRoomBacking);

        const dadsRoomBacking2 = new THREE.Mesh(
            new THREE.PlaneGeometry(this.config.width, this.config.height),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        dadsRoomBacking2.position.set(0, this.config.wallHeight, backWallZ - 0.08);
        dadsRoomBacking2.frustumCulled = false;
        hallway.add(dadsRoomBacking2);

        const backWall = this.createSurface('wall', {
            width: this.config.width,
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
              offset: { x: 0, y: 0 },
              repeat: { x: 1, y: 0.785 }
            },
            // Alpha hole is ~40% of image height; door mesh is 4/8 of wall (50%). Scale V so cutout matches door.
            alphaMapTextureOptions: {
              offset: { x: 0, y: 0 },
              repeat: { x: 1, y: 0.8 }
            },
            alphaTest: 0.5,
          });

          const door = new Door(this.scene);
          door.createDoor(0, -1, backWallZ);
          door.close();

          this.dadsRoomDoor = door;
          hallway.add(door.getDoorMesh());
        hallway.add(backWall);



        this.scene.add(hallway);
    }

    getDadsRoomDoor() {
        return this.dadsRoomDoor ?? null;
    }
}

export default Hallway;
