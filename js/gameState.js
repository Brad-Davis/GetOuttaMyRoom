import inventoryManager from "./utils/inventoryManager.js";
import Battle from "./events/battle.js";
import textOverlay from "./UI/textOverlay.js"
import enemySpawner from "./events/enemySpawner.js";
import player from "./templates/player.js";
import sceneService from "./utils/sceneService.js";
import interactionService from "./utils/interactionService.js";

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
    }


    goToStore() {

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
}

const gameState = new GameState();
export default gameState;