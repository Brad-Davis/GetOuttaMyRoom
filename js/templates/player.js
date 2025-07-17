import HealthBar from "../UI/healthBar.js";

class Player {
    constructor(name) {
        this.name = name;
        this.items = [];
        this.maxHp = 100;
        this.currentHp = this.maxHp;
        this.level = 1;
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

    startBattle() {
        this.HealthBar.showHealthBar();
        this.setHp(this.maxHp);
    }

    tick() {
        this.changeHp(-1);
    }

}

const player = new Player('Player');
export default player;