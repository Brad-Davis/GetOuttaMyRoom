import * as THREE from "three";
import gsap from "gsap";
import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";
import items from "../templates/items.js";
import effectsService from "../utils/effectsService.js";

/**
 * Pose name → 0-based frame index (same order as uncle1.png … uncle5.png).
 * Rename keys to whatever fits your game; keep values 0–4.
 */
export const UNCLE_POSES = Object.freeze({
    uncle1: 2,
    uncle2: 1,
    uncle3: 0,
    uncle4: 3,
    uncle5: 4,
});

/** Frames always uncle1.png … uncle5.png; pose values are 0-based indices into this list. */
const UNCLE_FRAME_URLS = [1, 2, 3, 4, 5].map(
    (n) => `./resources/images/uncle/uncle${n}.png`
);

class Uncle extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Uncle", [items["punch_heavy_001"]], hp, level, exp, gold, null, [0, -1, 0], null);
        /** @type {ReturnType<typeof setTimeout> | null} */
        this._attackPoseResetTimer = null;
    }

    async loadModel() {
        const textures = await Promise.all(
            UNCLE_FRAME_URLS.map((url) => loaderService.loadTexture(url))
        );
        for (const t of textures) {
            t.colorSpace = THREE.SRGBColorSpace;
        }
        const material = new THREE.SpriteMaterial({
            map: textures[0],
            alphaTest: 0.01,
            transparent: true,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2.5, 3, 3);
        sprite.renderOrder = 1;
        this.initBillboardSprite(sprite, textures);
    
        setTimeout(() => {
            if (this.normalPose) {
                this.normalPose();
            }
        }, 500);
    }

    /**
     * @param {keyof typeof UNCLE_POSES | 1 | 2 | 3 | 4 | 5} pose
     *   String: a key from {@link UNCLE_POSES}. Number: shorthand for uncle1…uncle5 (1–5 only).
     */
    setUnclePose(pose) {
        let index;
        if (typeof pose === "string") {
            if (!Object.prototype.hasOwnProperty.call(UNCLE_POSES, pose)) {
                console.warn(
                    `Unknown uncle pose "${pose}". Valid keys: ${Object.keys(UNCLE_POSES).join(", ")}`
                );
                return;
            }
            index = UNCLE_POSES[pose];
        } else {
            const n = Math.floor(Number(pose));
            if (!Number.isFinite(n) || n < 1 || n > 5) {
                console.warn("Uncle pose number must be 1–5, or pass a string key from UNCLE_POSES.");
                return;
            }
            index = n - 1;
        }
        this.setSpriteFrame(index);
    }

    normalPose() {
        if (this.currentHp <= 0) {
            return;
        } 
        this.setUnclePose('uncle1');
        console.log('normalPose');
    }

    attackPose() {
        if (this.currentHp <= 0) {
            return;
        } 
        this.setUnclePose('uncle3');
        console.log('attackPose');
    }

    damagePose() {
        if (this.currentHp <= 0) {
            return;
        } 
        this.setUnclePose('uncle2');
        console.log('damagePose');
    }
    
    healPose() {
        if (this.currentHp <= 0) return;
        this.setUnclePose('uncle4');
        console.log('healPose');
    }

    /**
     * Fired from {@link EnemyActiveItems} right before the enemy item’s `onUse` runs.
     */
    onEnemyItemUsed(_item, _slotIndex) {
        if (this._attackPoseResetTimer !== null) {
            clearTimeout(this._attackPoseResetTimer);
            this._attackPoseResetTimer = null;
        }
        this.attackPose();
        this._attackPoseResetTimer = setTimeout(() => {
            this._attackPoseResetTimer = null;
            this.normalPose();
        }, 600);
    }

    deathPose() {
        this.setUnclePose('uncle5');
        // THREE.Sprite ignores Object3D.rotation; billboard tilt uses SpriteMaterial.rotation (radians, screen plane).
        const material = /** @type {THREE.SpriteMaterial | undefined} */ (this.model?.material);
        const sinkY = this.model.position.y - 0.4;
        effectsService.playSfx('dead');
        const tl = gsap.timeline({
            onComplete: () => {
                if (this.model) this.model.visible = false;
            },
        });
        if (material && typeof material.rotation === "number") {
            tl.to(
                material,
                {
                    rotation: Math.PI / 2,
                    duration: 2,
                    ease: "power2.inOut",
                },
                0
            );
        }
        tl.to(
            this.model.position,
            {
                y: sinkY,
                duration: 2,
                ease: "power2.inOut",
            },
            0
        );
    }

    takeDamage(damage) {
        super.takeDamage(damage);
    }
}

export default Uncle;
