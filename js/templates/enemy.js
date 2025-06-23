import HealthBar from "../UI/healthBar.js";

class Enemy {
    constructor (  name, items,hp, level, exp, gold, gltf) {
        this.maxHp = hp;
        this.currentHp = hp;   
        this.items = items;
        this.name = name;
        this.level = level;
        this.exp = exp;
        this.gold = gold;
        this.enemyHealthBar = new HealthBar(document.getElementById("enemyHealthContainer"), this);
        this.gltf = gltf;
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