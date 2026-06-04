import Uncle from "../people/uncle.js";
import Cousin from "../people/cousin.js";
import Grandma from "../people/grandma.js";

class EnemySpawner {
    constructor() {
        const uncle = new Uncle(100, 1, 10, 10);
        const cousin = new Cousin(250, 1, 10, 10);
        const grandma = new Grandma(350, 1, 10, 10);
        this.enemies = [grandma, cousin, uncle];
        this.curEnemy = null;
    }

    peekNextEnemy() {
        return this.enemies.length ? this.enemies[this.enemies.length - 1] : null;
    }

    /** Remove the next door enemy without loading a battle. */
    skipNextEnemy() {
        const enemy = this.enemies.pop();
        if (!enemy) {
            return null;
        }
        if (this.curEnemy === enemy) {
            this.curEnemy = null;
        }
        return enemy;
    }

    async spawnEnemy() {
        const enemy = this.enemies.pop();
        if (!enemy) {
            alert("No enemies left");
            return;
        }
        this.curEnemy = enemy;
        await this.curEnemy.loadModel();
    }
    
}

const enemySpawner = new EnemySpawner();
export default enemySpawner;