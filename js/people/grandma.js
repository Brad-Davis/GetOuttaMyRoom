import * as THREE from "three";
import gsap from "gsap";
import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";
import items from "../templates/items.js";
import effectsService from "../utils/effectsService.js";
import dialogService from "../utils/dialogService.js";

/**
 * Pose name → 0-based frame index (same order as grandma1.png … grandma5.png).
 * Rename keys to whatever fits your game; keep values 0–4.
 */
export const GRANDMA_POSES = Object.freeze({
    grandma1: 2,
    grandma2: 1,
    grandma3: 0,
    grandma4: 3,
    grandma5: 4,
});

/** Frames always grandma1.png … grandma5.png; pose values are 0-based indices into this list. */
const GRANDMA_FRAME_URLS = [1, 2, 3, 4, 5].map(
    (n) => `./resources/images/grandma/grandma${n}.png`
);

class Grandma extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Grandma", [items["punch_heavy_001"]], hp, level, exp, gold, null, [0, -1, 0], null);
        /** @type {ReturnType<typeof setTimeout> | null} */
        this._attackPoseResetTimer = null;
    }

    async loadModel() {
        const textures = await Promise.all(
            GRANDMA_FRAME_URLS.map((url) => loaderService.loadTexture(url))
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
     * @param {keyof typeof GRANDMA_POSES | 1 | 2 | 3 | 4 | 5} pose
     *   String: a key from {@link GRANDMA_POSES}. Number: shorthand for grandma1…grandma5 (1–5 only).
     */
    setGrandmaPose(pose) {
        let index;
        if (typeof pose === "string") {
            if (!Object.prototype.hasOwnProperty.call(GRANDMA_POSES, pose)) {
                console.warn(
                    `Unknown grandma pose "${pose}". Valid keys: ${Object.keys(GRANDMA_POSES).join(", ")}`
                );
                return;
            }
            index = GRANDMA_POSES[pose];
        } else {
            const n = Math.floor(Number(pose));
            if (!Number.isFinite(n) || n < 1 || n > 5) {
                console.warn("Grandma pose number must be 1–5, or pass a string key from GRANDMA_POSES.");
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
        this.setGrandmaPose("grandma1");
        console.log("normalPose");
    }

    attackPose() {
        if (this.currentHp <= 0) {
            return;
        }
        this.setGrandmaPose("grandma3");
        console.log("attackPose");
    }

    damagePose() {
        if (this.currentHp <= 0) {
            return;
        }
        this.setGrandmaPose("grandma2");
        console.log("damagePose");
    }

    healPose() {
        if (this.currentHp <= 0) return;
        this.setGrandmaPose("grandma4");
        console.log("healPose");
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
        this.setGrandmaPose("grandma5");
        const material = /** @type {THREE.SpriteMaterial | undefined} */ (this.model?.material);
        const sinkY = this.model.position.y - 0.4;
        effectsService.playSfx("dead");
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
                speaker: "Grandma",
                text: "I only wanted you to eat something.",
            },
        ]);
    }

    getRandomDialog() {
        const dialogs = [
            [
                { speaker: "Grandma", text: "Have you eaten today?" },
                { speaker: "Grandma", text: "You look thin." },
            ],
            [
                { speaker: "Grandma", text: "Your grandfather left his glasses again." },
                { speaker: "Grandma", text: "Don't touch anything in the hallway." },
            ],
            [
                { speaker: "Grandma", text: "When I was your age we respected our elders." },
                { speaker: "Grandma", text: "Now sit down and listen." },
            ],
        ];
        const randomDialog = dialogs[Math.floor(Math.random() * dialogs.length)];
        return randomDialog;
    }
}

export default Grandma;
