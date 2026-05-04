import HealthBar from "../UI/healthBar.js";
import { playerActiveItems } from "../UI/activeItems.js";

class Player {
    constructor(name) {
        this.name = name;
        this.items = [];
        this.maxHp = 100;
        this.currentHp = this.maxHp;
        this.level = 1;
        this.basePhyDamage = 1;
        this.baseEmoDamage = 1;
        this.phyDamage = 1;
        this.emoDamage = 1;
        this.healthBuff = 1;
        this.baseHealthBuff = 1;
        this.HealthBar = new HealthBar(document.getElementById("playerHealthContainer"), this);
    }

    getHp () {
        return this.currentHp;
    }

    setHp (hp) {
        this.currentHp = hp;
        this.HealthBar.updateHealthBar();
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
        this.HealthBar.updateHealthBar();
    }

    triggerOverheal() {

    }

    die () {
        this.currentHp = 0;
    }

    getHpString () {
        return this.currentHp + "/" + this.maxHp;
    }

    takeDamage(damage) {
        // Visual feedback when taking damage
    }


    startBattle() {
        this.HealthBar.showHealthBar();
        this.setHp(this.maxHp);
    }

    tick() {
        // this.changeHp(-1);
        playerActiveItems.tickItems(0.1);
    }

    buffPhysical(amount) {
        this.phyDamage *= amount;
        console.log("Player physical damage buffed to " + this.phyDamage);
    }

    buffEmotional(amount) {
        this.emoDamage *= amount;
        console.log("Player emotional damage buffed to " + this.emoDamage);
    }

    buffHealth(amount) {
        this.healthBuff *= amount;
        console.log("Player health buffed to " + this.healthBuff);
    }

    resetBuffs() {
        this.phyDamage = this.basePhyDamage;
        this.emoDamage = this.baseEmoDamage;
        this.healthBuff = this.baseHealthBuff;
    }

}

const player = new Player('Player');
export default player;