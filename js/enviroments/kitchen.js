import Room from '../controls/room.js';
import * as THREE from 'three';
import gsap from 'gsap';
import Door from '../items/door.js';
import cameraService from '../utils/cameraPresets.js';
import loaderService from '../utils/loaderService.js';
import { KITCHEN_WORLD_Y } from './kitchenLayout.js';
import Mom from '../people/mom.js';
import Moon from '../items/moon.js';

const OUTSIDE2_MODEL_PATH = './resources/models/outside2.glb';
const OUTSIDE_VIDEO_PATH = './resources/images/soFarGone.mp4';
/** How many times the door-view video repeats horizontally on the backdrop plane. */
const OUTSIDE_VIDEO_TILE_COUNT = 3;
const OUTSIDE_VIDEO_TILE_WIDTH = 800;
/** World-unit bleed so adjacent tile planes overlap (no repeat-UV seams). */
const OUTSIDE_VIDEO_TILE_OVERLAP = 8;
const OUTSIDE_VIDEO_Y_OFFSET = 150;

const OUTSIDE_MOON_SCALE = 3.5;
const OUTSIDE_MOON_LIGHT_INTENSITY = 0.5;
const OUTSIDE_KEY_LIGHT_INTENSITY = 0.65;
const OUTSIDE_FILL_LIGHT_INTENSITY = 0.4;
const OUTSIDE_RIM_LIGHT_INTENSITY = 0.9;
const OUTSIDE_EMISSIVE_INTENSITY = 0.18;

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
        /** @type {THREE.Object3D | null} */
        this.outsideModel = null;
        /** @type {Moon | null} */
        this.outsideMoon = null;
        this._outsideAtmosphereActive = false;
        this._outsideVideoStarted = false;
        /** @type {{ key: THREE.DirectionalLight; fill: THREE.HemisphereLight; rim: THREE.PointLight } | null} */
        this.outsideLights = null;
        /** @type {{ mat: THREE.Material; intensity: number }[]} */
        this._outsideEmissiveTargets = [];
        /** @type {{ group: THREE.Group; videoTexture: THREE.VideoTexture; video: HTMLVideoElement } | null} */
        this._outsideVideoScreen = null;
        this.createKitchen();
        // setTimeout(() => {
        //     cameraService.lookAtKitchen();
        // }, 3000);
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
        door.createDoor(0, doorCenterY, backWallZ );
        door.close();

        this.kitchenDoor = door;
        kitchen.add(backWall);

        this.outsideLoadPromise = this._loadOutsideBeyondDoor(kitchen, backWallZ);

        this.scene.add(kitchen);
    }

    _configureOutsideModel(model) {
        model.scale.setScalar(1);
        model.rotation.y = 0;

        model.traverse((child) => {
            if (!child.isMesh) return;
            child.frustumCulled = false;
            if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                    mat.side = THREE.DoubleSide;
                });
            } else if (child.material) {
                child.material.side = THREE.DoubleSide;
            }
        });
    }

    /** Cityscape GLB just beyond the back-wall door (-Z), visible when the door opens. */
    async _loadOutsideBeyondDoor(kitchenGroup, backWallZ) {
        try {
            const gltf = await loaderService.loadGLTF(OUTSIDE2_MODEL_PATH);
            const model = gltf.scene;
            this.outsideModel = model;
            this._configureOutsideModel(model);
            model.scale.set(1, 0.7, 1);
            model.rotation.y = -Math.PI / 2;
            model.position.set(
                -1.5,
                this.config.floorLevel - 8,
                backWallZ - 248
            );
            
            kitchenGroup.add(model);
            this._addOutsideVideoScreen(kitchenGroup, model);
            this._setupOutsideBeyondDoorAtmosphere(kitchenGroup, model);
        } catch (error) {
            console.error('Error loading kitchen outside view model:', error);
        }
    }

    /**
     * Giant video backdrop behind the cityscape GLB — faces the kitchen door (-Z).
     * Separate planes per tile (shared texture) avoid repeat-UV seam gaps.
     */
    _addOutsideVideoScreen(kitchenGroup, landscapeModel) {
        const { x, y, z } = landscapeModel.position;
        const tileCount = OUTSIDE_VIDEO_TILE_COUNT;
        const tileWidth = OUTSIDE_VIDEO_TILE_WIDTH;
        const tileHeight = tileWidth * (9 / 16);
        const tileOverlap = OUTSIDE_VIDEO_TILE_OVERLAP;

        const video = document.createElement('video');
        video.src = OUTSIDE_VIDEO_PATH;
        video.loop = true;
        video.muted = true;
        video.preload = 'auto';
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.load();

        const videoTexture = new THREE.VideoTexture(video);
        videoTexture.colorSpace = THREE.SRGBColorSpace;
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.generateMipmaps = false;

        const geometry = new THREE.PlaneGeometry(tileWidth + tileOverlap, tileHeight);
        const material = new THREE.MeshBasicMaterial({
            map: videoTexture,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        const group = new THREE.Group();
        group.name = 'outsideVideoScreen';
        group.position.set(x, y + OUTSIDE_VIDEO_Y_OFFSET, z - 222);
        group.rotation.y = Math.PI;

        const centerIndex = (tileCount - 1) / 2;
        for (let i = 0; i < tileCount; i++) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.frustumCulled = false;
            mesh.renderOrder = -1;
            mesh.scale.x = -1;
            mesh.position.x = (i - centerIndex) * tileWidth;
            group.add(mesh);
        }

        kitchenGroup.add(group);
        this._outsideVideoScreen = { group, videoTexture, video };
    }

    /** Refresh video texture each frame (see AssetManager.updateAnimatedObjects). */
    update() {
        if (!this._outsideVideoScreen) return;
        const { video, videoTexture } = this._outsideVideoScreen;
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            videoTexture.needsUpdate = true;
        }
    }

    /** Moon + cool night lighting for the cityscape visible through the back door. */
    _setupOutsideBeyondDoorAtmosphere(kitchenGroup, model) {
        const { x: cx, y: cy, z: cz } = model.position;
        const moonY = cy + 55;

        const outsideMoon = new Moon(kitchenGroup);
        outsideMoon.createMoon(cx, moonY, cz);
        outsideMoon.moonMesh.scale.setScalar(0);
        if (outsideMoon.moonLight) {
            outsideMoon.moonLight.color.setHex(0x8eb4ff);
            outsideMoon.moonLight.intensity = 0;
            outsideMoon.moonLight.target.position.set(cx, cy, cz);
            kitchenGroup.add(outsideMoon.moonLight.target);
        }

        const keyLight = new THREE.DirectionalLight(0x6b9fff, 0);
        keyLight.position.set(cx - 25, moonY - 5, cz + 35);
        keyLight.target.position.set(cx, cy + 20, cz);
        kitchenGroup.add(keyLight);
        kitchenGroup.add(keyLight.target);

        const fill = new THREE.HemisphereLight(0x3d5f8a, 0x0a1018, 0);
        fill.position.set(cx, cy + 35, cz);
        kitchenGroup.add(fill);

        const rim = new THREE.PointLight(0x5a8fd4, 0, 180);
        rim.position.set(cx + 30, cy + 40, cz - 50);
        kitchenGroup.add(rim);

        model.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
                if (mat.emissive) {
                    mat.emissive.setHex(0x0c1a2e);
                    mat.emissiveIntensity = 0;
                    this._outsideEmissiveTargets.push({
                        mat,
                        intensity: OUTSIDE_EMISSIVE_INTENSITY,
                    });
                }
            });
        });

        this.outsideMoon = outsideMoon;
        this.outsideLights = { key: keyLight, fill, rim };
    }

    /** Fade in door-view moon + cool night lighting (Mom encounter scroll stop). */
    activateOutsideBeyondDoorAtmosphere({ duration = 1.4 } = {}) {
        if (this._outsideAtmosphereActive) return;
        this._outsideAtmosphereActive = true;

        const ease = 'power2.inOut';
        const moon = this.outsideMoon;
        if (moon?.moonMesh) {
            gsap.to(moon.moonMesh.scale, {
                x: OUTSIDE_MOON_SCALE,
                y: OUTSIDE_MOON_SCALE,
                z: OUTSIDE_MOON_SCALE,
                duration,
                ease,
            });
        }
        if (moon?.moonLight) {
            gsap.to(moon.moonLight, {
                intensity: OUTSIDE_MOON_LIGHT_INTENSITY,
                duration,
                ease,
            });
        }

        const lights = this.outsideLights;
        if (lights?.key) {
            gsap.to(lights.key, {
                intensity: OUTSIDE_KEY_LIGHT_INTENSITY,
                duration,
                ease,
            });
        }
        if (lights?.fill) {
            gsap.to(lights.fill, {
                intensity: OUTSIDE_FILL_LIGHT_INTENSITY,
                duration,
                ease,
            });
        }
        if (lights?.rim) {
            gsap.to(lights.rim, {
                intensity: OUTSIDE_RIM_LIGHT_INTENSITY,
                duration,
                ease,
            });
        }

        this._outsideEmissiveTargets.forEach(({ mat, intensity }) => {
            gsap.to(mat, {
                emissiveIntensity: intensity,
                duration,
                ease,
            });
        });

        this._startOutsideVideo();
    }

    /** Play door-view video with audio when night lighting fades in. */
    _startOutsideVideo() {
        const screen = this._outsideVideoScreen;
        if (!screen || this._outsideVideoStarted) return;
        this._outsideVideoStarted = true;

        const { video } = screen;
        const playWithAudio = () => {
            video.currentTime = 0;
            video.muted = false;
            video.volume = 1;
            video.play().catch(() => {
                video.muted = true;
                video.play().catch(() => {});
            });
        };

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            playWithAudio();
        } else {
            video.addEventListener('canplay', playWithAudio, { once: true });
        }
    }

    /** Place Mom on the kitchen floor (async — sprite loads after textures resolve). */
    async spawnMom() {
        if (this.mom?.model) return this.mom;

        const kitchenLength = 15;
        const kitchenCenterZ = -this.config.depth / 2 - kitchenLength / 2;
        const mom = new Mom(100, 1, 10, 10);
        await mom.loadModel();

        if (!mom.model) return null;

        // Sprite feet on floor: center is half of MOM_TARGET_HEIGHT above floorLevel.
        mom.model.position.set(2, this.config.floorLevel + 2, kitchenCenterZ - 2);
        this.kitchenGroup.add(mom.model);
        this.mom = mom;
        return mom;
    }

    getMom() {
        return this.mom ?? null;
    }

    getKitchenDoor() {
        return this.kitchenDoor ?? null;
    }

}

export default Kitchen;
