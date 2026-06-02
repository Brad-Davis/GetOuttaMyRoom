import Uncle from "../people/uncle.js";
import Cousin from "../people/cousin.js";
import Grandma from "../people/grandma.js";

class EnemySpawner {
    constructor() {
        const uncle = new Uncle(100, 1, 10, 10);
        const cousin = new Cousin(1000, 1, 10, 10);
        const grandma = new Grandma(1000, 1, 10, 10);
        this.enemies = [grandma, cousin, uncle];
        this.curEnemy = null;
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