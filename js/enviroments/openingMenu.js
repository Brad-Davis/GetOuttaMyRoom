import * as THREE from 'three';
import Room from '../controls/room.js';

/**
 * Minimal empty rectangular room shell for an opening-menu scene.
 * Uses a single inward-facing box (BackSide mats) centered at `{ x, y, z }` in parent space (`gameGroup`).
 *
 * Dimensions are **inner-ish** extents of the inverted box mesh (camera sits inside facing the walls).
 *
 * Config:
 * @param {number} [width=8]
 * @param {number} [height=5]
 * @param {number} [depth] — omit to reuse `width` (cube footprint)
 * @param {number} [x=0] — THREE world X offset of box center (relative to `scene` parent passed to `buildRoom`)
 * @param {number} [y=0] — THREE world Y offset of box center
 * @param {number} [z=0] — THREE world Z offset of box center (include this for depth placement alongside the bedroom)
 * @param {number} [wallColor] — hex color when `interiorTexture` is null; otherwise multiplied with the map (use `0xffffff` for untinted)
 * @param {string | null} [interiorTexture] — image filename under `resources/images/` (e.g. `wood.jpg`); `null` = solid `wallColor` only
 * @param {{ x?: number, y?: number }} [textureRepeat] — UV repeat for the interior map
 * @param {number} [rotationSpeedY=0] — radians per frame for menu-box Y rotation (set > 0 to spin)
 */
class OpeningMenu extends Room {
    constructor(config = {}) {
        const width = config.width ?? 8;
        const height = config.height ?? 5;
        const depth = config.depth ?? width;

        super('OpeningMenu', {
            width,
            height,
            depth,
            floorLevel: config.floorLevel ?? -height / 2,
            ceilingLevel: config.ceilingLevel ?? height / 2,
            wallHeight: config.wallHeight ?? 0,
        });

        /** @type {{ x: number, y: number, z: number }} */
        this.anchor = {
            x: config.x ?? 0,
            y: config.y ?? 0,
            z: config.z ?? 0,
        };
        /** @type {string | null} */
        this.interiorTexture = config.interiorTexture !== undefined ? config.interiorTexture : 'bush.jpg';
        const rep = config.textureRepeat ?? {};
        this.textureRepeat = { x: rep.x ?? 2, y: rep.y ?? 2 };
        this.wallColor = config.wallColor ?? (this.interiorTexture ? 0xffffff : 0x6a7585);

        /** @type {THREE.Mesh | null} */
        this.mesh = null;
        this.rotationSpeedY = config.rotationSpeedY ?? 0;
    }

    /**
     * @param {THREE.Object3D} scene Typically `gameGroup` from SceneManager (same usage as Bedroom)
     */
    buildRoom(scene) {
        const geometry = new THREE.BoxGeometry(this.config.width, this.config.height, this.config.depth);

        const matOpts = { side: THREE.BackSide };
        if (this.interiorTexture) {
            const map = new THREE.TextureLoader().load(
                `./resources/images/${this.interiorTexture}`,
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.minFilter = THREE.LinearMipmapLinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.needsUpdate = true;
                }
            );
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.repeat.set(this.textureRepeat.x, this.textureRepeat.y);
            matOpts.map = map;
            matOpts.color = new THREE.Color(this.wallColor);
        } else {
            matOpts.color = this.wallColor;
        }

        const material = new THREE.MeshLambertMaterial(matOpts);

        const box = new THREE.Mesh(geometry, material);
        box.name = 'OpeningMenuBox';
        box.position.set(this.anchor.x, this.anchor.y, this.anchor.z);

        this.mesh = box;
        scene.add(box);
        return box;
    }

    update() {
        if (!this.mesh || this.rotationSpeedY === 0) return;
        this.mesh.rotation.y += this.rotationSpeedY;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.geometry?.dispose();
            const mats = Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material];
            for (const m of mats) {
                if (m?.map) {
                    m.map.dispose();
                    m.map = null;
                }
                m?.dispose?.();
            }
            this.mesh = null;
        }
        super.dispose();
    }
}

export default OpeningMenu;
