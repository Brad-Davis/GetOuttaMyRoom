import inventory from "../UI/inventory.js";
import { playerActiveItems, enemyActiveItems } from "../UI/activeItems.js";
import items from "../templates/items.js";
import store from "../enviroments/store.js";
import dopamineManager from "../managers/dopamineManager.js";
import dialogService from "./dialogService.js";
import effectsService from "./effectsService.js";

class InventoryManager {
    constructor() {
        this.inventory = inventory;
        this.activeItems = playerActiveItems;
        this.enemyActiveItems = enemyActiveItems;
        this.inventoryContainer = document.getElementById("inventory-container");
        this.inventoryButton = document.getElementById("inventory-button");
        this.inventoryItems = document.getElementById("inventory-items");
        this.inventoryVisible = false;
        this.draggedItem = null;
        this.dragSource = null;

        this.inventoryButton.addEventListener("click", () => {
            if (this.inventoryVisible) {
                this.hideInventory();
            } else {
                this.showInventory();
            }
        });

        this.setupDragAndDrop();
        
        // Add test items to inventory for testing
        this.addTestItems();
    }

    addTestItems() {
        // Add some test items to the inventory
        this.inventory.addItem(items.punch_001);
        this.inventory.addItem(items.shot_001);
    }

    setupDragAndDrop() {
        // Set up drag and drop event listeners
        document.addEventListener('mouseover', (e) => {
            const rowEl = e.target.closest('.inventory-item, .active-item');
            if (rowEl) {
                this.showItemInfo(rowEl.dataset.itemId, rowEl);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const rowEl = e.target.closest('.inventory-item, .active-item');
            if (rowEl && !rowEl.contains(e.relatedTarget)) {
                this.removeItemInfo();
            }
        });

        document.addEventListener('dragstart', (e) => {
            if (e.target.closest('.inventory-item, .active-item')) {
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

    handleDragStart(e) {
        const rowEl = e.target.classList.contains('inventory-item') || e.target.classList.contains('active-item')
            ? e.target
            : e.target.closest('.inventory-item, .active-item');
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
        } else if (rowEl.classList.contains('inventory-item')) {
            this.dragSource = 'inventory';
        } else if (rowEl.classList.contains('active-item')) {
            this.dragSource = 'active';
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
        const target = e.target.closest('.inventory-item-container, .active-item-container');
        if (target) {
            target.classList.add('drag-over');
        }
    }

    handleDragExit(e) {
        const target = e.target.closest('.inventory-item-container, .active-item-container');
        if (target) {
            target.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        const target = e.target.closest('.inventory-item-container, .active-item-container');
        if (target && this.draggedItem) {
            const targetType = target.classList.contains('inventory-item-container') ? 'inventory' : 'active';

            if (this.dragSource === 'shop' && targetType !== 'active') {
                document.querySelectorAll('.inventory-item-container, .active-item-container').forEach((container) => {
                    container.classList.remove('drag-over');
                });
                return;
            }

            const itemId = this.draggedItem.id;
            let item = null;

            if (this.dragSource === 'inventory') {
                item = this.inventory.items.find(i => i.id === itemId);
            } else if (this.dragSource === 'active') {
                item = this.activeItems.items.find(i => i != null && i.id === itemId);
            } else if (this.dragSource === 'shop') {
                item = store.items.find(i => i.id === itemId);
            }

            if (item) {
                const containers = Array.from(document.querySelectorAll(
                    targetType === 'inventory' ? '.inventory-item-container' : '.active-item-container'
                ));
                const placementIndex = containers.indexOf(target);
                this.moveItem(item, this.dragSource, targetType, target, placementIndex);
            }
        }

        // Remove drag over styling from all containers
        document.querySelectorAll('.inventory-item-container, .active-item-container').forEach(container => {
            container.classList.remove('drag-over');
        });
    }

    handleDragEnd(e) {
        const rowEl = e.target.classList.contains('inventory-item') || e.target.classList.contains('active-item')
            ? e.target
            : e.target.closest('.inventory-item, .active-item');
        if (rowEl) {
            rowEl.style.opacity = '1';
        }

        this.draggedItem = null;
        this.dragSource = null;
    }

    showItemInfo(itemId, sourceEl = null) {
        const item = items[itemId];
        const itemInfoBlock = document.getElementById('item-info-block');
        if (!item || !itemInfoBlock) return;

        const inShop = sourceEl && sourceEl.closest('#shop-items');
        const costLine = inShop
            ? `<p>Dopamine cost: ${item.value}</p>`
            : '';

        itemInfoBlock.style.display = 'block';
        itemInfoBlock.innerHTML = `
            <img src="${item.image}" alt="${item.name}" title="${item.name}">
            <p>${item.description}</p>
            <p>Value: ${item.value}</p>
            ${costLine}
            <p>Recharge Time: ${item.rechargeTime}</p>
        `;
    }

    removeItemInfo() {
        const itemInfoBlock = document.getElementById('item-info-block');
        itemInfoBlock.style.display = 'none';
    }

    moveItem(item, source, target, targetContainer, placementIndex) {
        // Don't move if dropping on the same type
        if (source === target) {
            // SWAP ACTIVE ITEMS INTERNALLY!!!!
            return;
        }

        // Check if target container already has an item
        const hasItem = targetContainer.classList.contains('has-item');
        
        if (source === 'inventory' && target === 'active') {
            this.inventory.removeItem(item);
            const swapItem = this.activeItems.addItem(item, placementIndex);
            if (swapItem) {
                this.inventory.addItem(swapItem);
            }
        } else if (source === 'shop' && target === 'active') {
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
            //BOUGHT ITEM FROM SHOP
            


            store.removeItem(item);
            const swapItem = this.activeItems.addItem(item, placementIndex);
            if (swapItem) {
                this.inventory.addItem(swapItem);
            }
        } else if (source === 'active' && target === 'inventory') {
            // Moving from active items to inventory
            this.activeItems.removeItem(item);
            this.inventory.addItem(item);
        }
    }

    showInventory() {
        this.inventoryVisible = true;
        this.inventoryItems.style.transform = "translate(0%, -50%)";
    }

    hideInventory() {
        this.inventoryVisible = false;
        this.inventoryItems.style.transform = "translate(100%, -50%)";
    }

    hideAllElements() {
        this.inventoryContainer.style.opacity = 0;
        this.inventoryContainer.style.pointerEvents = "none";
    }

    showAllElements() {
        this.inventoryContainer.style.opacity = 1;
        this.inventoryContainer.style.pointerEvents = "auto";
    }

    resetAllActiveItems() {
        this.activeItems.items.forEach(item => {
            if (item) {
                item.currentCharge = 0;
                item.isReady = false;
            }
        });
        this.activeItems.renderItems();

        this.enemyActiveItems.items.forEach(item => {
            if (item) {
                item.currentCharge = 0;
                item.isReady = false;
            }
        });
        this.enemyActiveItems.hideEnemyItems();
    }
}

const inventoryManager = new InventoryManager();
export default inventoryManager;