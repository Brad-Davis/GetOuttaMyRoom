import inventoryManager from "./utils/inventoryManager.js";
import Battle from "./events/battle.js";
import textOverlay from "./UI/textOverlay.js"
import enemySpawner from "./events/enemySpawner.js";
import player from "./templates/player.js";
import sceneService from "./utils/sceneService.js";
import interactionService from "./utils/interactionService.js";
import store from "./enviroments/store.js";
import effectsService from "./utils/effectsService.js";

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
        this.painContainer = document.getElementById('pain-container');
        this.selfPainContainer = document.getElementById('self-pain-container');
    }

    createGameEvents() {
        this.allEvents = [
            
        ]
    }

    // Add the global hurtEnemy function
    hurt(damage, fromEnemy = false, physical = true) {
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

        if (fromEnemy) {
            if (physical) {
                console.log("Player physical damage is " + this.player.phyDamage);
                damage *= this.currentEvent.enemy.phyDamage;
            } else {
                console.log("Player emotional damage is " + this.player.emoDamage);
                damage *= this.currentEvent.enemy.emoDamage;
            }
            this.player.changeHp(-damage);
            this.player.takeDamage(damage);
        } else {
        // Deal damage to the current enemy
            if (physical) {
                damage *= this.player.phyDamage;
            } else {
                damage *= this.player.emoDamage;
            }
            console.log(`Dealing ${damage} damage to ${this.currentEvent.enemy.name}`);
            this.currentEvent.enemy.changeHp(-damage);
            this.currentEvent.enemy.takeDamage(damage);
            this.generatePainText(damage, fromEnemy, physical);
        }

        
        return true;
    }

    heal(healAmount, fromEnemy = false) {
        // Mirrors `hurt`: `fromEnemy === false` means the player's action → in battle that
        // damages the enemy but *healing* targets the player (e.g. chips). `true` heals the enemy.
        if (!fromEnemy) {
            healAmount *= this.player.healthBuff;
            this.player.changeHp(healAmount);
            this.generateHealText(healAmount, fromEnemy);
        } else if (this.currentEvent?.enemy) {
            this.currentEvent.enemy.changeHp(healAmount);
            this.generateHealText(healAmount, fromEnemy);
        }
    }
    
    generatePainText(damage, fromEnemy = false, physical = true) {
        const painText = document.createElement('div');
        painText.classList.add('pain-text');
        if (physical) {
            painText.textContent += `-${damage} HP`;
            painText.style.color = 'rgb(255, 0, 0, 0.75)';
        }
        if (!physical) {
            painText.textContent += `-${damage * this.player.emoDamage} HP`;
            painText.style.color = 'rgb(255, 43, 163, 0.75)';
        }
        if (fromEnemy) {
            this.selfPainContainer.appendChild(painText);
        } else {
            this.painContainer.appendChild(painText);
        }
        // Remove the pain text after 2 seconds
        setTimeout(() => {
            if (painText.parentNode) {
                painText.parentNode.removeChild(painText);
            }
        }, 2000);
    }

    generateHealText(healAmount, fromEnemy = false) {
        const healText = document.createElement('div');
        healText.classList.add('heal-text');
        healText.textContent += `+${healAmount} HP`;
        healText.style.color = 'rgb(0, 255, 0, 0.75)';
        if (fromEnemy) {
            this.selfPainContainer.appendChild(healText);
        } else {
            this.painContainer.appendChild(healText);
        }
        // Remove the heal text after 2 seconds
        setTimeout(() => {
            if (healText.parentNode) {
                healText.parentNode.removeChild(healText);
            }
        }, 2000);
    }

    hurtPlayer(damage) {
        this.player.takeDamage(damage);
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

    async goToBattle(door, options = {}) {
        const { skipPrompt = false, openDoorOnStart = false } = options;
        if (this.firstBattle && !skipPrompt) {
            this.showAreYouReadyForBattle(door);
            return false;
        }
        await this.enemySpawner.spawnEnemy();
        if (!this.enemySpawner.curEnemy) {
            return false;
        }
        this.currentEvent = new Battle(this.player, this.enemySpawner.curEnemy);
        this.currentEvent.startBattle();
        if (openDoorOnStart && door && !door.doorOpen) {
            door.open();
        }
        interactionService.disable();
        return true;
    }

    async startBattleNow(door) {
        this.firstBattle = false;
        return this.goToBattle(door, { skipPrompt: true, openDoorOnStart: true });
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
        this.inventoryManager.resetAllActiveItems();
        interactionService.enable();
        this.textOverlay.showWindowOverlay("You have won the battle!", 
            "e won the battle!!! What item do you want to take?", 
            this.getCurrentEnemyItems().map(item => {
                if (item) {
                    return `
                    <div class="item-container">    
                    <img src="${item.image}" alt="${item.name}"></img>
                    <p>${item.name}</p>
                    </div>
                    `;
                }
            }),
            [() => this.textOverlay.closeWindowOverlay(),() => {this.goToBattle(); this.textOverlay.closeWindowOverlay();}]);
    }

    getCurrentEnemyItems() {
        return this.currentEvent.enemy.items;
    }

    loseBattle() {
    }

    resetPosition() {
        this.leaveStore();
    }

    kill(reason) {
        effectsService.playSfx('death');
        this.player.die();
        const message =
            reason != null && String(reason).trim() !== ''
                ? String(reason)
                : 'You have died.';
        this.textOverlay.showWindowOverlay(message, 'Game over', ['Okay'], [
            () => {
                window.location.reload();
            },
        ]);
    }
}

const gameState = new GameState();

// Make hurtEnemy globally available for weapons
window.hurt = (damage, fromEnemy = false) => {
    return gameState.hurt(damage, fromEnemy);
};

window.heal = (healAmount, fromEnemy = false) => {
    gameState.heal(healAmount, fromEnemy);
    return true;
};

window.buffPlayer = (buffPhysical, buffEmotional = 1, buffHealth = 1) => {
    gameState.player.buffPhysical(buffPhysical);
    gameState.player.buffEmotional(buffEmotional);
    gameState.player.buffHealth(buffHealth);
    return true;
};

window.kill = (reason) => {
    gameState.kill(reason);
    return true;
};

export default gameState;