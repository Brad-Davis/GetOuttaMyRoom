import * as THREE from "three";
import gsap from "gsap";
import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";
import items from "../templates/items.js";
import effectsService from "../utils/effectsService.js";
import dialogService from "../utils/dialogService.js";

/**
 * Pose name → 0-based frame index (same order as uncle1.png … uncle5.png).
 * Rename keys to whatever fits your game; keep values 0–4.
 */
export const COUSIN_POSES = Object.freeze({
    cousin1: 2,
    cousin2: 1,
    cousin3: 0,
    cousin4: 3,
    cousin5: 4,
});

/** Frames always cousin1.png … cousin5.png; pose values are 0-based indices into this list. */
const COUSIN_FRAME_URLS = [1, 2, 3, 4, 5].map(
    (n) => `./resources/images/cousin/cousin${n}.png`
);

class Cousin extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Cousin", [items["bite_001"], items["shot_001"]], hp, level, exp, gold, null, [0, -1, 2], null);
        /** @type {ReturnType<typeof setTimeout> | null} */
        this._attackPoseResetTimer = null;
    }

    async loadModel() {
        const textures = await Promise.all(
            COUSIN_FRAME_URLS.map((url) => loaderService.loadTexture(url))
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
        const tex = textures[0];
        const img = tex.image;
        const targetHeight = 2;
        const aspect = img.width / img.height;
        sprite.scale.set(targetHeight * aspect, targetHeight, 1);
        sprite.renderOrder = 1;
        this.initBillboardSprite(sprite, textures);
    
        setTimeout(() => {
            if (this.normalPose) {
                this.normalPose();
            }
        }, 500);
    }

    /**
     * @param {keyof typeof COUSIN_POSES | 1 | 2 | 3 | 4 | 5} pose
     *   String: a key from {@link COUSIN_POSES}. Number: shorthand for cousin1…cousin5 (1–5 only).
     */
    setCousinPose(pose) {
        let index;
        if (typeof pose === "string") {
            if (!Object.prototype.hasOwnProperty.call(COUSIN_POSES, pose)) {
                console.warn(
                    `Unknown cousin pose "${pose}". Valid keys: ${Object.keys(COUSIN_POSES).join(", ")}`
                );
                return;
            }
            index = COUSIN_POSES[pose];
        } else {
            const n = Math.floor(Number(pose));
            if (!Number.isFinite(n) || n < 1 || n > 5) {
                console.warn("Cousin pose number must be 1–5, or pass a string key from COUSIN_POSES.");
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
        this.setCousinPose('cousin1');
        console.log('normalPose');
    }

    attackPose() {
        if (this.currentHp <= 0) {
            return;
        } 
        this.setCousinPose('cousin3');
        console.log('attackPose');
    }

    damagePose() {
        if (this.currentHp <= 0) {
            return;
        } 
        this.setCousinPose('cousin2');
        console.log('damagePose');
    }
    
    healPose() {
        if (this.currentHp <= 0) return;
        this.setCousinPose('cousin4');
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
        this.setCousinPose('cousin5');
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

    dieEvent() {
        dialogService.clearDialog();
        dialogService.runLines([
            {
                speaker: 'Cousin',
                text: "WAHHHHHHHHHHHHHH"
            },
        ]);
    }

    getRandomDialog() {
        const dialogs = [
            [{"speaker": "Cousin", "text": "I want u ded"}, {"speaker": "Cousin", "text": "No one will believe u"}],
            [{"speaker": "Cousin", "text": "where's MY MOMMMMYYY"}, {"speaker": "Cousin", "text": "I must feed"}],
            [{"speaker": "Cousin", "text": "U r old"}, {"speaker": "Cousin", "text": "R u scared u'll die soon??"}],
        ]
        const randomDialog = dialogs[Math.floor(Math.random() * dialogs.length)];
        return randomDialog
    }
}

export default Cousin;
