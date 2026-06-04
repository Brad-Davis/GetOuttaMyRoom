import gameState from "../gameState.js";
import interactionService from "../utils/interactionService.js";
import dialogService from "../utils/dialogService.js";
import audioService from "../utils/audioService.js";
import { isSpeakingActive } from "../templates/items.js";

/** Base item tick delta per 100ms loop frame (see player/enemy tick). */
const BASE_ITEM_TICK_DELTA = 0.1;
/** Recharge multiplier ramps from 1 → max over the course of a fight. */
const RECHARGE_ACCEL_START = 1;
const RECHARGE_ACCEL_GROWTH_PER_FRAME = 0.012;
const RECHARGE_ACCEL_MAX = 8;
/** Unarmed player (no inventory / active items): much faster ramp so the fight moves. */
const RECHARGE_ACCEL_NO_ITEMS_START = 6;
const RECHARGE_ACCEL_NO_ITEMS_GROWTH_PER_FRAME = 0.1;
const RECHARGE_ACCEL_NO_ITEMS_MAX = 32;
/** Item recharge stays flat until this many ms, then inner monologue + ramp begins. */
const RECHARGE_ACCEL_DELAY_MS = 90_000;
const BATTLE_LOOP_MS = 100;

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
        this.rechargeSpeedMultiplier = 1;
        this.battleElapsedMs = 0;
        this.rechargeAccelUnlocked = false;
        this.rechargeAccelUnlocking = false;
    }

    playerHasNoItems() {
        return !this.gameState.inventoryManager.hasAnyItems();
    }

    getRechargeAccelConfig() {
        if (this.playerHasNoItems()) {
            return {
                start: RECHARGE_ACCEL_NO_ITEMS_START,
                growth: RECHARGE_ACCEL_NO_ITEMS_GROWTH_PER_FRAME,
                max: RECHARGE_ACCEL_NO_ITEMS_MAX,
            };
        }
        return {
            start: RECHARGE_ACCEL_START,
            growth: RECHARGE_ACCEL_GROWTH_PER_FRAME,
            max: RECHARGE_ACCEL_MAX,
        };
    }

    getItemTickDelta() {
        return BASE_ITEM_TICK_DELTA * this.rechargeSpeedMultiplier;
    }

    async tryUnlockRechargeAccel() {
        if (this.playerHasNoItems()) {
            return;
        }
        if (
            this.rechargeAccelUnlocked ||
            this.rechargeAccelUnlocking ||
            this.battleElapsedMs < RECHARGE_ACCEL_DELAY_MS
        ) {
            return;
        }

        this.rechargeAccelUnlocking = true;

        if (!this.battleRunning) {
            this.rechargeAccelUnlocking = false;
            return;
        }

        this.rechargeAccelUnlocked = true;
        this.rechargeSpeedMultiplier = this.getRechargeAccelConfig().start;
        this.rechargeAccelUnlocking = false;
    }

    rampRechargeSpeed() {
        if (!this.rechargeAccelUnlocked) return;
        const { growth, max } = this.getRechargeAccelConfig();
        if (this.rechargeSpeedMultiplier > max) {
            this.rechargeSpeedMultiplier = max;
        }
        if (this.rechargeSpeedMultiplier >= max) return;
        this.rechargeSpeedMultiplier = Math.min(
            max,
            this.rechargeSpeedMultiplier + growth
        );
    }

    startBattle() {
        this.battleElapsedMs = 0;
        this.rechargeAccelUnlocking = false;
        if (this.playerHasNoItems()) {
            this.rechargeAccelUnlocked = true;
            this.rechargeSpeedMultiplier = this.getRechargeAccelConfig().start;
        } else {
            this.rechargeSpeedMultiplier = 1;
            this.rechargeAccelUnlocked = false;
        }
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
        this.battleElapsedMs += BATTLE_LOOP_MS;
        void this.tryUnlockRechargeAccel();
        const itemTickDelta = this.getItemTickDelta();
        this.player.tick(itemTickDelta);
        this.enemy.tick(itemTickDelta);
        this.rampRechargeSpeed();
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
        if (this.enemy.isDefeated || this.enemy.getHp() <= 0) {
            this.battleLog.push("Enemy has died!");
            if (!this.enemy.isDefeated) {
                this.enemy.die();
            }
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
        }, BATTLE_LOOP_MS);
    }

    endBattle(playerWon) {
        this.battleRunning = false;
        this.rechargeAccelUnlocking = false;
        this.player.resetBuffs();
        if (this.enemy) {
            this.enemy.phyDamage = 1;
            this.enemy.emoDamage = 1;
        }
        this.hideBattleElements();
        audioService.restoreBackgroundMusicAfterBattle(this.enemy);
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