import inventoryManager from "./utils/inventoryManager.js";
import Battle from "./events/battle.js";
import textOverlay from "./UI/textOverlay.js"
import enemySpawner from "./events/enemySpawner.js";
import player from "./templates/player.js";
import sceneService from "./utils/sceneService.js";
import store from "./enviroments/store.js";
import effectsService from "./utils/effectsService.js";
import missionService from "./utils/missionService.js";
import dialogService from "./utils/dialogService.js";
import iframeControls from "./UI/iframeControls.js";
import {
    setSkipIntroForNextLoad,
    saveBattleCheckpoint,
    shouldSkipFirstFight,
    shouldSkipSecondFight,
    shouldSkipThirdFight,
} from "./config/gameFlow.js";
import speakButtonManager from "./controls/speakButton.js";
import {
    restorePlayerInventoryAfterRespawn,
    savePlayerInventoryForRespawn,
} from "./utils/inventoryPersistence.js";

/** @typedef {'linkedin' | 'tinder' | 'youtube'} ComputerPhase */

class GameState {
    constructor() {
        /** @type {ComputerPhase} */
        this.computerPhase = 'linkedin';
        this.player = player;
        this.inventoryManager = inventoryManager;
        this.currentEvent = null;
        this.allEvents = [];
        this.textOverlay = textOverlay
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
            damage = Math.floor(damage);
            this.player.changeHp(-damage);
            this.player.takeDamage(damage);
            this.generatePainText(damage, fromEnemy, physical);
        } else {
        // Deal damage to the current enemy
            if (this.currentEvent.enemy.isDefeated) {
                return false;
            }
            if (physical) {
                damage *= this.player.phyDamage;
            } else {
                damage *= this.player.emoDamage;
            }
            damage = Math.floor(damage);
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
            const enemy = this.currentEvent.enemy;
            if (enemy.isDefeated) {
                return;
            }
            enemy.changeHp(healAmount);
            this.generateHealText(healAmount, fromEnemy);
        }
    }
    
    generatePainText(damage, fromEnemy = false, physical = true) {
        const painText = document.createElement('div');
        painText.classList.add('pain-text');
        painText.textContent = `-${damage} HP`;
        if (physical) {
            painText.style.color = 'rgb(255, 0, 0, 0.75)';
        } else {
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

        missionService.completeMissionContaining('bed goblin');
    }

    leaveStore() {
        if (this.atStore) {
            this.store.hideSetup();
            this.atStore = false;
        }
    }

    _shouldSkipDoorFight(enemyName) {
        if (enemyName === 'Uncle') return shouldSkipFirstFight();
        if (enemyName === 'Cousin') return shouldSkipSecondFight();
        if (enemyName === 'Grandma') return shouldSkipThirdFight();
        return false;
    }

    _closeDoorAfterDoorFight() {
        const door = window.gameEngine?.getAssetManager?.()?.getGameObject('door');
        if (door?.doorOpen) {
            door.close();
        }
    }

    /**
     * Apply dev skip flags as soon as assets exist so the dresser iframe and wake text
     * match the current checkpoint (not only after opening the door).
     */
    applyDevSkipCheckpointsAtStart() {
        if (shouldSkipFirstFight() && this.enemySpawner.peekNextEnemy()?.name === 'Uncle') {
            this.enemySpawner.skipNextEnemy();
            this.prepareForSecondBattle({ silent: true });
        }
        if (shouldSkipSecondFight() && this.enemySpawner.peekNextEnemy()?.name === 'Cousin') {
            this.enemySpawner.skipNextEnemy();
            this.prepareForThirdBattle({ silent: true });
        }
        if (shouldSkipThirdFight() && this.enemySpawner.peekNextEnemy()?.name === 'Grandma') {
            this.enemySpawner.skipNextEnemy();
        }
        restorePlayerInventoryAfterRespawn(this.inventoryManager);
    }

    /** Dev skip: same door/post-fight bookkeeping as winning, plus battle prep checkpoints. */
    _applyDoorFightSkipCheckpoint(enemyName) {
        if (enemyName !== 'Grandma') {
            this.inventoryManager.resetAllActiveItems();
        }
        if (enemyName === 'Uncle' || enemyName === 'Cousin') {
            this._closeDoorAfterDoorFight();
        }
        if (enemyName === 'Uncle') {
            this.prepareForSecondBattle({ silent: this.computerPhase !== 'linkedin' });
        } else if (enemyName === 'Cousin') {
            this.prepareForThirdBattle({ silent: this.computerPhase === 'youtube' });
        } else if (enemyName === 'Grandma') {
            this.startThirtiesChapter();
        }
    }

    /** Post–Grandma beat: turn around and run the Thirties hello / chase intro. */
    startThirtiesChapter() {
        speakButtonManager.startThirties();
    }

    async goToBattle(door, options = {}) {
        const { openDoorOnStart = false, skipNoItemsPrompt = false, skipShopItemsPrompt = false } = options;
        if (!skipShopItemsPrompt && this.store.items.length > 0) {
            this.showShopItemsRemainingPrompt(door, options);
            return false;
        }
        if (!skipNoItemsPrompt && !this.inventoryManager.hasAnyItems()) {
            this.showAreYouReadyForBattle(door);
            return false;
        }

        const nextEnemy = this.enemySpawner.peekNextEnemy();
        if (nextEnemy && this._shouldSkipDoorFight(nextEnemy.name)) {
            this.enemySpawner.skipNextEnemy();
            this._applyDoorFightSkipCheckpoint(nextEnemy.name);
            if (openDoorOnStart && door && !door.doorOpen) {
                door.open();
            }
            return true;
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
        return true;
    }

    async startBattleNow(door) {
        return this.goToBattle(door, {
            skipNoItemsPrompt: true,
            skipShopItemsPrompt: true,
            openDoorOnStart: true,
        });
    }

    /** Scroll-hallway fight with the Thirties model already in the world. */
    async startThirtiesScrollBattle(thirties) {
        if (!thirties) return false;
        await thirties.loadModel();
        if (!thirties.model) return false;
        this.currentEvent = new Battle(this.player, thirties);
        this.currentEvent.startBattle();
        return true;
    }

    showShopItemsRemainingPrompt(door, options = {}) {
        this.textOverlay.showWindowOverlay(
            "There are still items in the bed goblin's shop.",
            "Don't forget your gear",
            ["Okay, I'll go buy something", "Continue to battle anyway"],
            [
                () => this.textOverlay.closeWindowOverlay(),
                () => {
                    this.textOverlay.closeWindowOverlay();
                    void this.goToBattle(door, { ...options, skipShopItemsPrompt: true });
                },
            ]
        );
    }

    showAreYouReadyForBattle(door) {
        this.textOverlay.showWindowOverlay("You have no protection, go talk to the bed goblin.", 
            "Are you ready for battle?", 
            ["Okay I'll go talk to the bed goblin :/ ", "LET ME OUT OF HERE"], 
            [
                () => this.textOverlay.closeWindowOverlay(),
                () => {
                    this.textOverlay.closeWindowOverlay();
                    void this.startBattleNow(door);
                },
            ]);
    }

    goToSacrifice() {

    }

    async winBattle() {
        this.inventoryManager.resetAllActiveItems();
        const defeatedEnemy = this.currentEvent.enemy;
        if (defeatedEnemy.name === 'Uncle') {
            saveBattleCheckpoint(1);
        } else if (defeatedEnemy.name === 'Cousin') {
            saveBattleCheckpoint(2);
        } else if (defeatedEnemy.name === 'Grandma') {
            saveBattleCheckpoint(3);
        }
        const shouldCloseDoor =
            defeatedEnemy.name === 'Uncle' || defeatedEnemy.name === 'Cousin';
        if (shouldCloseDoor) {
            const door = window.gameEngine?.getAssetManager?.()?.getGameObject('door');
            if (door?.doorOpen) {
                door.close();
            }
        }
        defeatedEnemy.dieEvent();
    }

    getCurrentEnemyItems() {
        return this.currentEvent.enemy.items;
    }

    loseBattle() {
        this.kill('You were defeated in battle.');
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
                savePlayerInventoryForRespawn(this.inventoryManager);
                setSkipIntroForNextLoad(true);
                window.location.reload();
            },
        ]);
    }

    /** Tinder computer, mission, and bed goblin shop — before the second battle stretch. */
    prepareForSecondBattle({ silent = false } = {}) {
        const computer = window.gameEngine?.getAssetManager?.()?.getGameObject('computer');
        computer?.resetForNewTinderSession?.();
        this.computerPhase = 'tinder';

        if (!silent) {
            void iframeControls.tinderStartup();
        }

        this.store.refillShopWithLinkedInItems();
    }

    prepareForThirdBattle({ silent = false } = {}) {
        const computer = window.gameEngine?.getAssetManager?.()?.getGameObject('computer');
        computer?.resetForNewYoutubeSession?.();
        this.computerPhase = 'youtube';

        if (!silent) {
            void iframeControls.youtubeStartup();
        } else {
            missionService.setCurrentMission('Post on Youtube to get dopamine.');
        }

        this.store.refillShopWithYoutubeItems();
    }
}

const gameState = new GameState();

// Make hurtEnemy globally available for weapons
window.hurt = (damage, fromEnemy = false, physical = true) => {
    return gameState.hurt(damage, fromEnemy, physical);
};

window.heal = (healAmount, fromEnemy = false) => {
    gameState.heal(healAmount, fromEnemy);
    return true;
};

window.buffPlayer = (buffPhysical, buffEmotional = 1, buffHealth = 1, fromEnemy = false) => {
    if (fromEnemy && gameState.currentEvent?.enemy) {
        gameState.currentEvent.enemy.phyDamage *= buffPhysical;
        gameState.currentEvent.enemy.emoDamage *= buffEmotional;
        return true;
    }

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