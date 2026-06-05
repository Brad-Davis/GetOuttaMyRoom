import { playerActiveItems, enemyActiveItems } from "../UI/activeItems.js";
import items from "../templates/items.js";
import store from "../enviroments/store.js";
import dopamineManager from "../managers/dopamineManager.js";
import dialogService from "./dialogService.js";
import effectsService from "./effectsService.js";
import { hasPendingInventoryRestore } from "./inventoryPersistence.js";
import backButtonManager from "../controls/backButton.js";

class InventoryManager {
    constructor() {
        this.activeItems = playerActiveItems;
        this.enemyActiveItems = enemyActiveItems;
        this.inventoryContainer = document.getElementById("inventory-container");
        this.draggedItem = null;
        this.dragSource = null;
        this.dragSourceIndex = null;

        this.setupDragAndDrop();
        this.setupShopClick();

        if (!hasPendingInventoryRestore()) {
            this.addTestItems();
        }

        this.activeItems.updateTitleVisibility();
    }

    addTestItems() {
        // this.activeItems.addItem(items.punch_001);
        // this.activeItems.addItem(items.shot_001);
        // this.activeItems.addItem(items.scream_001);
    }

    setupDragAndDrop() {
        document.addEventListener('mouseover', (e) => {
            const rowEl = e.target.closest('.active-item, .enemy-active-item, #shop-items .inventory-item');
            if (rowEl) {
                this.showItemInfo(rowEl.dataset.itemId, rowEl);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const rowEl = e.target.closest('.active-item, .enemy-active-item, #shop-items .inventory-item');
            if (rowEl && !rowEl.contains(e.relatedTarget)) {
                this.removeItemInfo();
            }
        });

        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                return;
            }
            if (e.target.closest('.active-item, #shop-items .inventory-item')) {
                this.handleDragStart(e);
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(e);
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.handleDragExit(e);
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e);
        });

        document.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });
    }

    setupShopClick() {
        document.addEventListener('click', (e) => {
            if (this._suppressShopClick) {
                this._suppressShopClick = false;
                return;
            }

            const shopEl = document.getElementById('shop');
            if (!shopEl?.classList.contains('is-open')) return;

            const rowEl = e.target.closest('#shop-items .inventory-item');
            if (!rowEl) return;

            const item = store.items.find((i) => i.id === rowEl.dataset.itemId);
            if (item) {
                this.buyShopItem(item);
            }
        });
    }

    buyShopItem(item) {
        this.moveItem(item, 'shop', 'active', null, this.activeItems.items.length);
    }

    handleDragStart(e) {
        const rowEl = e.target.classList.contains('active-item') || e.target.classList.contains('inventory-item')
            ? e.target
            : e.target.closest('.active-item, .inventory-item');
        if (!rowEl) return;

        const shopSlot = rowEl.closest('#shop-items .shop-item-container');
        if (shopSlot) {
            const item = store.items.find((i) => i.id === rowEl.dataset.itemId);
            if (!item) {
                e.preventDefault();
                return;
            }
            if (!dopamineManager.canAfford(item.value)) {
                e.preventDefault();
                dopamineManager.notEnoughDopamine();
                dialogService.runLines([
                    {
                        speaker: 'BED GOBLIN',
                        text: 'YOU HAVE NO DOPAMINE! LEAVE ME BE!',
                    },
                ]);
                return;
            }
            this.dragSource = 'shop';
            this.dragSourceIndex = null;
        } else if (rowEl.classList.contains('active-item')) {
            this.dragSource = 'active';
            this.dragSourceIndex = this.activeItems.items.findIndex((i) => i?.id === rowEl.dataset.itemId);
        } else {
            return;
        }

        this.draggedItem = {
            id: rowEl.dataset.itemId,
            type: rowEl.dataset.itemType,
            element: rowEl
        };

        rowEl.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(e) {
        const target = e.target.closest('.active-item-container, #active-items-slots');
        if (target) {
            target.classList.add('drag-over');
        }
    }

    handleDragExit(e) {
        const target = e.target.closest('.active-item-container, #active-items-slots');
        if (target) {
            target.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        const target = e.target.closest('.active-item-container, #active-items-slots');
        if (target && this.draggedItem) {
            if (this.dragSource === 'shop' || this.dragSource === 'active') {
                const containers = this.activeItems.getItemContainers();
                const placementIndex = target.id === 'active-items-slots'
                    ? this.activeItems.items.length
                    : containers.indexOf(target);
                if (placementIndex === -1) return;

                const itemId = this.draggedItem.id;
                let item = null;

                if (this.dragSource === 'active') {
                    item = this.activeItems.items.find((i) => i?.id === itemId);
                    if (item && this.dragSourceIndex !== null && this.dragSourceIndex !== placementIndex) {
                        this.activeItems.reorderItem(this.dragSourceIndex, placementIndex);
                        document.querySelectorAll('.active-item-container').forEach((container) => {
                            container.classList.remove('drag-over');
                        });
                        return;
                    }
                } else if (this.dragSource === 'shop') {
                    item = store.items.find((i) => i.id === itemId);
                }

                if (item) {
                    this.moveItem(item, this.dragSource, 'active', target, placementIndex);
                }
            }
        }

        document.querySelectorAll('.active-item-container, #active-items-slots').forEach((container) => {
            container.classList.remove('drag-over');
        });
    }

    handleDragEnd(e) {
        const rowEl = e.target.classList.contains('active-item') || e.target.classList.contains('inventory-item')
            ? e.target
            : e.target.closest('.active-item, .inventory-item');
        if (rowEl) {
            rowEl.style.opacity = '1';
        }

        if (this.dragSource === 'shop') {
            this._suppressShopClick = true;
        }

        this.draggedItem = null;
        this.dragSource = null;
        this.dragSourceIndex = null;
    }

    showItemInfo(itemId, sourceEl = null) {
        let item = items[itemId];
        if (!item) {
            item = this.findItemById(itemId);
        }
        const itemInfoBlock = document.getElementById('item-info-block');
        const contentEl = document.getElementById('item-info-content');
        const titleEl = document.getElementById('item-info-title');
        if (!item || !itemInfoBlock || !contentEl) return;

        if (titleEl) {
            titleEl.textContent = item.name;
        }

        const inShop = Boolean(sourceEl?.closest('#shop-items'));
        const stats = [];

        if (item.phyDamage > 0) {
            stats.push({ label: 'PHY', value: item.phyDamage, modifier: 'item-stat--phy' });
        }
        if (item.emoDamage > 0) {
            stats.push({ label: 'EMO', value: item.emoDamage, modifier: 'item-stat--emo' });
        }
        if (item.phyBuff > 0) {
            stats.push({ label: 'PHY BUFF', value: item.phyBuff, modifier: 'item-stat--phy' });
        }
        if (item.emoBuff > 0) {
            stats.push({ label: 'EMO BUFF', value: item.emoBuff, modifier: 'item-stat--emo' });
        }

        const statsHtml = stats.length
            ? `<div class="item-info-stats">${stats.map((stat) => `
                    <span class="item-stat ${stat.modifier}">
                        <span class="item-stat-label">${stat.label}</span>
                        <span class="item-stat-value">${stat.value}</span>
                    </span>
                `).join('')}</div>`
            : '';

        const metaFields = [];

        if (inShop) {
            metaFields.push({ label: 'Dopamine', value: item.value, highlight: true });
        }
        metaFields.push(
            { label: 'Value', value: item.value },
            { label: 'Recharge', value: `${item.rechargeTime}s` },
        );

        const metaHtml = metaFields.map((field) => `
            <span class="status-bar-field item-info-meta-field${field.highlight ? ' item-info-meta-field--highlight' : ''}">
                ${field.label}: <strong>${field.value}</strong>
            </span>
        `).join('');

        contentEl.innerHTML = `
            <div class="item-info-layout${stats.length ? '' : ' item-info-layout--solo'}">
                <div class="item-info-visual panel-inset">
                    <img src="${item.image}" alt="">
                </div>
                ${statsHtml ? `<div class="item-info-details">${statsHtml}</div>` : ''}
            </div>
            <div class="item-info-description panel-inset">
                <p>${item.description}</p>
            </div>
            <div class="item-info-meta">${metaHtml}</div>
        `;

        itemInfoBlock.style.display = 'block';
    }

    findItemById(itemId) {
        if (!itemId) return null;
        const fromActive = this.activeItems.items.find((i) => i?.id === itemId);
        if (fromActive) return fromActive;
        const fromEnemy = this.enemyActiveItems.items.find((i) => i?.id === itemId);
        if (fromEnemy) return fromEnemy;
        return null;
    }

    removeItemInfo() {
        const itemInfoBlock = document.getElementById('item-info-block');
        itemInfoBlock.style.display = 'none';
    }

    moveItem(item, source, target, targetContainer, placementIndex) {
        if (source !== 'shop' || target !== 'active') {
            return;
        }

        const cost = item.value;
        if (!dopamineManager.trySpend(cost)) {
            dialogService.runLines([
                {
                    speaker: 'BED GOBLIN',
                    text: 'YOU HAVE NO DOPAMINE! LEAVE ME BE!',
                }
            ]);
            effectsService.playSfx('notEnoughDopamine');
            return;
        }

        store.removeItem(item);
        this.activeItems.addItem(item, placementIndex);
    }

    hideAllElements() {
        if (!this.inventoryContainer) return;
        this.inventoryContainer.style.opacity = '0';
        this.inventoryContainer.style.pointerEvents = 'none';
    }

    showAllElements() {
        if (!this.inventoryContainer) return;
        this.inventoryContainer.style.opacity = '1';
        this.inventoryContainer.style.pointerEvents = 'auto';
    }

    /** Active items, dopamine, damage multipliers — kitchen walk / end credits. */
    hideGameplayHud() {
        if (this._gameplayHudHidden) return;
        this._gameplayHudHidden = true;

        this.hideAllElements();

        this._savedHudDisplay = this._savedHudDisplay ?? {};
        for (const id of ['dopamine-container', 'damage-multiplier-hud']) {
            const el = document.getElementById(id);
            if (!el) continue;
            this._savedHudDisplay[id] = el.style.display;
            el.style.display = 'none';
        }

        const itemInfo = document.getElementById('item-info-block');
        if (itemInfo) {
            this._savedHudDisplay['item-info-block'] = itemInfo.style.display;
            itemInfo.style.display = 'none';
        }

        backButtonManager.hideBackButton();
        backButtonManager.disable();
    }

    isGameplayHudHidden() {
        return Boolean(this._gameplayHudHidden);
    }

    hasAnyItems() {
        return this.activeItems.items.length > 0;
    }

    resetAllActiveItems() {
        this.activeItems.items.forEach(item => {
            if (item) {
                item.currentCharge = 0;
                item.isReady = false;
            }
        });
        this.activeItems.refreshAllChargeVisuals();
        this.activeItems.renderItems();

        this.enemyActiveItems.items.forEach(item => {
            if (item) {
                item.currentCharge = 0;
                item.isReady = false;
            }
        });
        this.enemyActiveItems.refreshAllChargeVisuals();
        this.enemyActiveItems.hideEnemyItems();
    }
}

const inventoryManager = new InventoryManager();
export default inventoryManager;
