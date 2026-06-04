import Room from '../controls/room.js';
import * as THREE from 'three';
import Door from '../items/door.js';

/** Depth of Dad's room end cap along -Z — long enough you never scroll through it visually. */
export const DADS_ROOM_WALL_DEPTH = 280;
/** Local Z of the wall face toward the bedroom (hallway seal plane). */
export const DADS_ROOM_WALL_LOCAL_Z = -200;

/** Match kitchen: shrink alpha cutout on 12-wide doored walls so the frame fits the 2-unit door mesh. */
const DOOR_TEX_SCALE_X = 1.2;
const DOOR_TEX_OFFSET_X = 0.5 * (1 - DOOR_TEX_SCALE_X);

/** Hallway mesh shake after scroll battles (local offsets on the hallway group). */
export const HALLWAY_SHAKE_TIERS = {
    1: { posAmp: 0.07, rotAmp: 0.005, speed: 14 },
    2: { posAmp: 0.2, rotAmp: 0.015, speed: 24 },
};

class Hallway extends Room {
    constructor(scene) {
        super('Hallway', {
            width: 12,
            height: 8,
            depth: 10,
            floorLevel: -3,
            ceilingLevel: 5,
            wallHeight: 1,
        });
        this.scene = scene;
        this.hallwayGroup = null;
        this._shakeTier = 0;
        this._shakeBase = { x: 0, y: 0, z: 0, rotZ: 0 };
        this.createHallway();
    }

    setShakeTier(tier) {
        const next = tier === 1 || tier === 2 ? tier : 0;
        if (next === this._shakeTier) return;

        if (next > 0 && this._shakeTier === 0 && this.hallwayGroup) {
            this._shakeBase.x = this.hallwayGroup.position.x;
            this._shakeBase.y = this.hallwayGroup.position.y;
            this._shakeBase.z = this.hallwayGroup.position.z;
            this._shakeBase.rotZ = this.hallwayGroup.rotation.z;
        }

        this._shakeTier = next;
        if (next === 0) {
            this.stopShake();
        }
    }

    updateShake(timeSec = performance.now() * 0.001) {
        if (!this.hallwayGroup || this._shakeTier === 0) return;

        const cfg = HALLWAY_SHAKE_TIERS[this._shakeTier];
        const t = timeSec * cfg.speed;
        const g = this.hallwayGroup;

        g.position.x =
            this._shakeBase.x +
            Math.sin(t * 1.7) * cfg.posAmp +
            Math.sin(t * 2.3) * cfg.posAmp * 0.45;
        g.position.y = this._shakeBase.y + Math.cos(t * 2.1) * cfg.posAmp * 0.35;
        g.position.z = this._shakeBase.z;
        g.rotation.z = this._shakeBase.rotZ + Math.sin(t * 1.3) * cfg.rotAmp;
    }

    stopShake() {
        this._shakeTier = 0;
        if (!this.hallwayGroup) return;

        const g = this.hallwayGroup;
        g.position.x = this._shakeBase.x;
        g.position.y = this._shakeBase.y;
        g.position.z = this._shakeBase.z;
        g.rotation.z = this._shakeBase.rotZ;
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
        const bridgeW = 8;
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
              offset: { x: DOOR_TEX_OFFSET_X, y: 0 },
              repeat: { x: DOOR_TEX_SCALE_X, y: 0.785 }
            },
            // Alpha hole is ~40% of image height; door mesh is 4/8 of wall (50%). Scale V so cutout matches door.
            alphaMapTextureOptions: {
              offset: { x: DOOR_TEX_OFFSET_X, y: 0 },
              repeat: { x: DOOR_TEX_SCALE_X, y: 0.8 }
            },
            alphaTest: 0.5,
          });

          const door = new Door(this.scene);
          door.createDoor(0, -1, backWallZ);

          this.dadsRoomDoor = door;
          hallway.add(door.getDoorMesh());
        hallway.add(backWall);



        this.hallwayGroup = hallway;
        this.scene.add(hallway);
    }

    getDadsRoomDoor() {
        return this.dadsRoomDoor ?? null;
    }
}

export default Hallway;
