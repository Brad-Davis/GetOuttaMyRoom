import inventoryManager from "./utils/inventoryManager.js";
import Battle from "./events/battle.js";
import textOverlay from "./UI/textOverlay.js"
import enemySpawner from "./events/enemySpawner.js";
import player from "./templates/player.js";
import sceneService from "./utils/sceneService.js";
import interactionService from "./utils/interactionService.js";
import store from "./enviroments/store.js";

class GameState {
    constructor() {
        this.player = player;
        this.inventoryManager = inventoryManager;
        this.currentEvent = null;
        this.allEvents = [];
        this.textOverlay = textOverlay
        this.firstBattle = true;
        this.enemySpawner = enemySpawner;
        this.sceneService = sceneService;
        this.store = store;
        this.atStore = false;
    }

    // Add the global hurtEnemy function
    hurtEnemy(damage) {
        // Check if we're currently in a battle
        if (!this.currentEvent || !this.currentEvent.enemy) {
            console.warn('No enemy to hurt - not in battle');
            return false;
        }

        // Check if battle is running
        if (!this.currentEvent.battleRunning) {
            console.warn('Battle is not currently running');
            return false;
        }

        // Deal damage to the current enemy
        console.log(`Dealing ${damage} damage to ${this.currentEvent.enemy.name}`);
        this.currentEvent.enemy.changeHp(-damage);
        this.currentEvent.enemy.takeDamage(damage);
        
        return true;
    }


    goToStore() {
        if (!this.atStore) {
            this.store.showSetup(this.sceneService.getScene());
            this.atStore = true;
        }
    }

    leaveStore() {
        if (this.atStore) {
            this.store.hideSetup();
            this.atStore = false;
        }
    }

    async goToBattle(door) {
        if (this.firstBattle) {
            this.showAreYouReadyForBattle(door);
            return false;
        }
        await this.enemySpawner.spawnEnemy();
        this.currentEvent = new Battle(this.player, this.enemySpawner.curEnemy);
        this.currentEvent.startBattle();
        interactionService.disable();
        return true;
    }

    showAreYouReadyForBattle(door) {
        this.firstBattle = false;
        this.textOverlay.showWindowOverlay("You have no protection you incel, go talk to the bed goblin.", 
            "Are you ready for battle?", 
            ["Okay I'll go talk to the bed goblin :/ ", "LET ME OUT OF HERE"], 
            [() => this.textOverlay.closeWindowOverlay(),() => {this.goToBattle(); door.open(); this.textOverlay.closeWindowOverlay();}]);
        
    }

    goToSacrifice() {

    }

    winBattle() {
        interactionService.enable();
        this.textOverlay.showWindowOverlay("You have won the battle!", 
            "You have won the battle!!! What item do you want to take?", 
            ["Okay I'll go talk to the bed goblin :/ ", "LET ME OUT OF HERE"], 
            [() => this.textOverlay.closeWindowOverlay(),() => {this.goToBattle(); this.textOverlay.closeWindowOverlay();}]);
    }

    loseBattle() {
    }

    resetPosition() {
        this.leaveStore();
    }
}

const gameState = new GameState();

// Make hurtEnemy globally available for weapons
window.hurtEnemy = (damage) => {
    return gameState.hurtEnemy(damage);
};

export default gameState;