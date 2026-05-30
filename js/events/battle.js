import gameState from "../gameState.js";
import interactionService from "../utils/interactionService.js";
import dialogService from "../utils/dialogService.js";
import audioService from "../utils/audioService.js";
import { isSpeakingActive } from "../templates/items.js";

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
        this.randomDialogTime = 1000;
    }

    startBattle() {
        this.battleRunning = true;
        interactionService.setBattleBlocking(true);
        audioService.playBattleMusic();
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

    sayRandomDialog() {
        const dialog = this.enemy.getRandomDialog();
        console.log(dialog);
        dialogService.runLines(dialog);
    }

    startBattleLoop() {
        document.getElementById('active-items').style.display = 'block';
        document.getElementById('inventory-button').style.display = 'block';
        if (!this.battleRunning) return;
        // Player tick handels item charging
        this.player.tick();
        this.enemy.tick();
        // this.showHealth(); THIS IS HANDLED IN PLAYER AND ENEMY
        if (this.randomDialogTime <= 0) {
            if (!isSpeakingActive()) {
                this.enemy.sayRandomDialog();
            }
            this.randomDialogTime = 10000;
        } else {
            this.randomDialogTime -= 1;
        }

        this.randomDialogTime -= 100;
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
        audioService.playDefaultBackgroundMusic();
        if (playerWon) {
            this.gameState.winBattle();
        } else {
            this.gameState.loseBattle();
        }
        interactionService.setBattleBlocking(false);
    }

    // showHealth() {
    //     this.playerHpBar.innerText = this.player.getHpString();
    //     this.enemyHpBar.innerText = this.enemy.getHpString();
    // }
}

export default Battle;