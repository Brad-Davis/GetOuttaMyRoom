import items, { cloneItemFromTemplate } from '../templates/items.js';
import store from '../enviroments/store.js';

const STORAGE_KEY = 'gomr_player_inventory_v1';

function getShopItemIds() {
    return new Set(store.items.map((item) => item?.id).filter(Boolean));
}

function isListedInShop(itemId, shopIds) {
    return shopIds.has(itemId);
}

function readPayload() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writePayload(payload) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn('[inventoryPersistence] save failed', e);
    }
}

function serializeSlot(item) {
    if (!item?.id) return null;
    return {
        id: item.id,
        currentCharge: item.currentCharge ?? 0,
        isReady: !!item.isReady,
    };
}

function deserializeSlot(slot) {
    if (!slot?.id) return null;
    const template = items[slot.id];
    if (!template) {
        console.warn('[inventoryPersistence] unknown item id:', slot.id);
        return null;
    }
    return cloneItemFromTemplate(template, {
        currentCharge: slot.currentCharge ?? 0,
        isReady: !!slot.isReady,
    });
}

/** Persist bag + equipped slots for the next reload after death. */
export function savePlayerInventoryForRespawn(inventoryManager) {
    const payload = {
        v: 1,
        inventory: inventoryManager.inventory.items.map((item) => serializeSlot(item)),
        active: inventoryManager.activeItems.items.map((item) => serializeSlot(item)),
    };
    writePayload(payload);
}

export function hasPendingInventoryRestore() {
    const payload = readPayload();
    return !!payload?.v;
}

/** @returns {boolean} true if a death-save was applied */
export function restorePlayerInventoryAfterRespawn(inventoryManager) {
    const payload = readPayload();
    if (!payload?.v) return false;

    const shopIds = getShopItemIds();
    inventoryManager.inventory.items.length = 0;
    inventoryManager.activeItems.items = [null, null];

    for (const slot of payload.inventory ?? []) {
        if (!slot?.id || isListedInShop(slot.id, shopIds)) continue;
        const item = deserializeSlot(slot);
        if (item) inventoryManager.inventory.items.push(item);
    }

    const activeSlots = payload.active ?? [];
    activeSlots.forEach((slot, index) => {
        if (index >= inventoryManager.activeItems.items.length) return;
        if (!slot?.id || isListedInShop(slot.id, shopIds)) {
            inventoryManager.activeItems.items[index] = null;
            return;
        }
        inventoryManager.activeItems.items[index] = deserializeSlot(slot);
    });

    inventoryManager.inventory.renderItems();
    inventoryManager.activeItems.renderItems();
    inventoryManager.activeItems.refreshAllChargeVisuals();
    return true;
}

/** Full restart from intro (hold / idle) — do not carry items over. */
export function clearPlayerInventorySave() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* sessionStorage unavailable */
    }
}
