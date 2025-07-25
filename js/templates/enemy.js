import HealthBar from "../UI/healthBar.js";
import sceneService from "../utils/sceneService.js";
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
        this.changeHp(-1);
    }



}

export default Enemy