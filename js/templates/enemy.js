import HealthBar from "../UI/healthBar.js";
import sceneService from "../utils/sceneService.js";
import { enemyActiveItems } from "../UI/activeItems.js";
import gsap from 'gsap';

class Enemy {
    constructor (  name, items,hp, level, exp, gold, gltf, center, model) {
        this.maxHp = hp;
        this.currentHp = hp;   
        this.items = items;
        this.name = name;
        this.level = level;
        this.exp = exp;
        this.gold = gold;
        this.enemyHealthBar = new HealthBar(document.getElementById("enemyHealthContainer"), this);
        this.gltf = gltf;
        this.startPosition = [0, 0, -10];
        this.endPosition = [0, 0, -5];
        this.center = center;
        this.model = null;
        this.moveAnimation = null;
        this.attackTimer = 2.5;
        this.currentAttackTimer = 0;
        /** @type {THREE.Sprite | null} */
        this._billboardSprite = null;
        /** @type {THREE.Texture[] | null} */
        this._frameTextures = null;
        /** @type {number} */
        this._currentSpriteFrame = 0;
        this.phyDamage = 1;
        this.emoDamage = 1;
    }

    /**
     * Use a single THREE.Sprite that swaps textures (see {@link setSpriteFrame}).
     * @param {THREE.Sprite} sprite
     * @param {THREE.Texture[]} textures
     */
    initBillboardSprite(sprite, textures) {
        this.model = sprite;
        this._billboardSprite = sprite;
        this._frameTextures = textures;
        this._currentSpriteFrame = 0;
    }

    /**
     * Show frame `index` (0-based). No-op if this enemy was not set up with {@link initBillboardSprite}.
     * @param {number} index
     */
    setSpriteFrame(index) {
        if (!this._billboardSprite || !this._frameTextures?.length) return;
        const max = this._frameTextures.length - 1;
        const i = Math.max(0, Math.min(max, Math.floor(Number(index))));
        const mat = this._billboardSprite.material;
        mat.map = this._frameTextures[i];
        mat.needsUpdate = true;
        this._currentSpriteFrame = i;
    }

    /** @returns {number} Current 0-based frame, or 0 if not billboard-based */
    getSpriteFrame() {
        return this._frameTextures?.length ? this._currentSpriteFrame : 0;
    }

    getHp () {
        return this.currentHp;
    }

    setHp (hp) {
        this.currentHp = hp;
        this.enemyHealthBar.updateHealthBar();
    }

    changeHp (hp) {
        this.currentHp += hp;
        if (hp < 0) {
            // TAKING DAMAGE
            if (this.damagePose) {
                this.damagePose();
                setTimeout(() => {
                    this.normalPose();
                }, 1000);
            }
        } else {
            // HEALING
            if (this.healPose) {
                this.healPose();
                setTimeout(() => {
                    this.normalPose();
                }, 1000);
            }
        }
        if (this.currentHp > this.maxHp) {
            this.currentHp = this.maxHp;
        } else {
            this.triggerOverheal();
        }
        if (this.currentHp < 0) {
            this.die();
        }
        this.enemyHealthBar.updateHealthBar();
    }

    triggerOverheal() {

    }

    die () {
        this.currentHp = 0;
        if (this.deathPose) {
            this.deathPose();
        }
    }


    takeDamage(damage) {
        // Visual feedback when taking damage
        if (this.model) {
            // Store original material colors

            // Damage shake animation
            const originalPosition = {
                x: this.model.position.x,
                y: this.model.position.y,
                z: this.model.position.z
            };

            gsap.timeline()
                .to(this.model.position, {
                    x: originalPosition.x + (Math.random() - 0.5) * 0.2,
                    y: originalPosition.y + (Math.random() - 0.5) * 0.2,
                    z: originalPosition.z + (Math.random() - 0.5) * 0.1,
                    duration: 0.1,
                    ease: "power2.out"
                })
                .to(this.model.position, {
                    x: originalPosition.x,
                    y: originalPosition.y,
                    z: originalPosition.z,
                    duration: 0.1,
                    ease: "power2.out"
                });
        }

        // Log the damage for debugging
        console.log(`${this.name} took ${damage} damage! (${this.currentHp}/${this.maxHp} HP remaining)`);
    }

    getHpString () {
        return this.currentHp + "/" + this.maxHp;
    }

    getTimeOfNextAttack () {
        let minAttackTime = Infinity;
        let itemIndex = -1
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].getChargeRemaining() < minAttackTime) {
                minAttackTime = this.items[i].getTimeOfNextAttack();
                itemIndex = i;
            }
        }
        return [minAttackTime, itemIndex];
    }

    enterScene() {
        this.model.position.set(this.startPosition[0] + this.center[0], this.startPosition[1] + this.center[1], this.startPosition[2] + this.center[2]);
        sceneService.getScene().add(this.model);
        enemyActiveItems.renderEnemyItems(this);
        this.moveTo(this.endPosition);
    }

    setPosition(position) {
        //ADDS THE CENTER OF THE ENEMY TO THE POSITION
        this.model.position.set(position[0] + this.center[0], position[1] + this.center[1], position[2] + this.center[2]);
    }

    moveTo(position) {
        if (!this.model) return;
        
        // Kill any existing animation on this model
        if (this.moveAnimation) {
            this.moveAnimation.kill();
        }
        
        // Calculate target position with center offset
        const targetPosition = {
            x: position[0] + this.center[0],
            y: position[1] + this.center[1],
            z: position[2] + this.center[2]
        };
        
        // Animate to the new position using GSAP
        this.moveAnimation = gsap.to(this.model.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration: 1, // 1 second
            ease: "power2.out", // Smooth ease-out curve
            onComplete: () => {
                this.moveAnimation = null; // Clear reference when done
            }
        });
    }

    startBattle() {
        this.enterScene();
        this.setHp(this.maxHp);
        this.enemyHealthBar.showHealthBar();
    }
    
    tick() {
        // this.changeHp(-1)
        enemyActiveItems.tickItems(0.1);

        // It would be great to show enemy attacks and show them charging.
        // For now every second we should have a low chance of the enemy attacking.
        // if (Math.random() < 0.1) {
        //     this.changeHp(-1);
        // }
    }

    /**
     * Called right before an enemy active item fires (see EnemyActiveItems.tickItems).
     * Override for poses / telegraphs.
     * @param {import('./items.js').Item} item
     * @param {number} slotIndex
     */
    onEnemyItemUsed(item, slotIndex) {}



}

export default Enemy