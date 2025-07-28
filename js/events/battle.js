import gameState from "../gameState.js";

class Battle {
    constructor(player, enemy) {
        this.player = player;
        this.enemy = enemy;
        this.battleLog = [];
        this.battleRunning = false;
        this.playerHpBar = document.getElementById("playerHealthText");
        this.enemyHpBar = document.getElementById("enemyHealthText");
        this.battleElements = document.getElementById("battleMode");
        this.gameState = gameState;
    }

    startBattle() {
        this.battleRunning = true;
        this.enemy.startBattle();
        this.player.startBattle();
        this.showBattleElements();
        this.battleLog.push("Battle started!");
        this.startBattleLoop();
    }

    showBattleElements() {
        this.battleElements.style.opacity = 1;
    }

    hideBattleElements() {
        this.battleElements.style.opacity = 0;
    }

    startBattleLoop() {
        if (!this.battleRunning) return;
        // Player tick handels item charging
        this.player.tick();
        this.enemy.tick();
        // this.showHealth(); THIS IS HANDLED IN PLAYER AND ENEMY
        
        // In event of tie the player wins
        if (this.enemy.getHp() <= 0) {
            this.battleLog.push("Enemy has died!");
            this.enemy.die();
            this.endBattle(/*playerWon*/true);
            return;
        }
        if (this.player.getHp() <= 0) {
            this.battleLog.push("Player has died!");
            this.player.die();
            this.endBattle(/*playerWon*/false);
            return;
        }
        
        setTimeout(() => {
            this.startBattleLoop();
        }, 100);
    }

    endBattle(playerWon) {
        this.battleRunning = false;
        this.hideBattleElements();
        if (playerWon) {
            this.gameState.winBattle();
        } else {
            this.gameState.loseBattle();
        }
    }

    // showHealth() {
    //     this.playerHpBar.innerText = this.player.getHpString();
    //     this.enemyHpBar.innerText = this.enemy.getHpString();
    // }
}

export default Battle;