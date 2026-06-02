import * as THREE from "three";
import gsap from "gsap";
import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";
import items from "../templates/items.js";
import effectsService from "../utils/effectsService.js";
import dialogService from "../utils/dialogService.js";

const MOM_TEXTURE_URL = "./resources/images/mom.png";

/** Single-frame for now; all poses map to index 0 until more mom sprites exist. */
export const MOM_POSES = Object.freeze({
    mom1: 0,
    mom2: 0,
    mom3: 0,
    mom4: 0,
    mom5: 0,
});

class Mom extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Mom", [items["punch_heavy_001"]], hp, level, exp, gold, null, [0, -1, 0], null);
        /** @type {ReturnType<typeof setTimeout> | null} */
        this._attackPoseResetTimer = null;
    }

    async loadModel() {
        const texture = await loaderService.loadTexture(MOM_TEXTURE_URL);
        texture.colorSpace = THREE.SRGBColorSpace;
        const textures = [texture];
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
     * @param {keyof typeof MOM_POSES | 1} pose
     *   String: a key from {@link MOM_POSES}. Number: shorthand for mom1 (1 only until more frames exist).
     */
    setMomPose(pose) {
        let index;
        if (typeof pose === "string") {
            if (!Object.prototype.hasOwnProperty.call(MOM_POSES, pose)) {
                console.warn(
                    `Unknown mom pose "${pose}". Valid keys: ${Object.keys(MOM_POSES).join(", ")}`
                );
                return;
            }
            index = MOM_POSES[pose];
        } else {
            const n = Math.floor(Number(pose));
            if (!Number.isFinite(n) || n < 1 || n > 1) {
                console.warn("Mom pose number must be 1, or pass a string key from MOM_POSES.");
                return;
            }
            index = 0;
        }
        this.setSpriteFrame(index);
    }

    normalPose() {
        if (this.currentHp <= 0) {
            return;
        }
        this.setMomPose("mom1");
    }

    attackPose() {
        if (this.currentHp <= 0) {
            return;
        }
        this.setMomPose("mom3");
    }

    damagePose() {
        if (this.currentHp <= 0) {
            return;
        }
        this.setMomPose("mom2");
    }

    healPose() {
        if (this.currentHp <= 0) return;
        this.setMomPose("mom4");
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
        this.setMomPose("mom5");
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
                speaker: "Mom",
                text: "I'm not mad. I'm just disappointed.",
            },
        ]);
    }

    getRandomDialog() {
        const dialogs = [
            [
                { speaker: "Mom", text: "Have you been on that computer again?" },
                { speaker: "Mom", text: "Ever since the incident I've had to keep an eye on you." },
            ],
            [
                { speaker: "Mom", text: "Did you eat?" },
                { speaker: "Mom", text: "There's food in the kitchen. You know where it is." },
            ],
            [
                { speaker: "Mom", text: "Your uncle said you smell weird in there." },
                { speaker: "Mom", text: "Is that true? Don't lie to me." },
            ],
        ];
        return dialogs[Math.floor(Math.random() * dialogs.length)];
    }
}

export default Mom;
