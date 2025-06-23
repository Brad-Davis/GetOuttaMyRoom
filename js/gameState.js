import Inventory from "./UI/inventory.js";
import textOverlay from "./UI/textOverlay.js"

class GameState {
    constructor() {
        this.inventory = new Inventory();
        this.player = new Player('Player');
        this.currentEvent = null;
        this.textOverlay = new textOverlay();
        // You can add other global game properties here
        // this.playerHealth = 100;
        // this.currentLevel = 1;
    }
}

const gameState = new GameState();
export default gameState;