class Battle {
    constructor(player, enemy) {
        this.player = player;
        this.enemy = enemy;
        this.battleLog = [];
        this.battleRunning = false;

        this.enemyHpBar = document.getElementById("enemyHealthText");
    }

    startBattle() {
        this.enemy.startBattle();
        this.player.startBattle();
        this.battleLog.push("Battle started!");
        this.startBattleLoop();
    }

    startBattleLoop() {
        if (!this.battleRunning) return;
        this.player.tick();
        this.enemy.tick();
        this.showHealth();
        
        // In event of tie the player wins
        if (this.enemy.getHp() <= 0) {
            this.battleLog.push("Enemy has died!");
            this.enemy.die();
            this.endBattle();
            return;
        }
        if (this.player.getHp() <= 0) {
            this.battleLog.push("Player has died!");
            this.player.die();
            this.endBattle();
            return;
        }
        
        setTimeout(() => {
            this.startBattleLoop();
        }, 300);
    }

    showHealth() {
        this.playerHpBar.innerText = this.player.getHpString();
        this.enemyHpBar.innerText = this.enemy.getHpString();
    }
}

export default Battle;