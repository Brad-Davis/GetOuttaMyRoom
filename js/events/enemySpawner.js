import Uncle from "../people/uncle.js";

class EnemySpawner {
    constructor() {
        const uncle = new Uncle(100, 1, 10, 10);
        this.enemies = [uncle];
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