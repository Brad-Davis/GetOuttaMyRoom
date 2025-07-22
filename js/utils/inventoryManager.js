import inventory from "../UI/inventory.js";
import activeItems from "../UI/activeItems.js";
import items from "../templates/items.js";

class InventoryManager {
    constructor() {
        this.inventory = inventory;
        this.activeItems = activeItems;
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
        this.inventory.addItem(items.phone_001);
        this.inventory.addItem(items.cd_001);
        this.inventory.addItem(items.punch_001);
        this.inventory.addItem(items.pentagram_001);
        this.inventory.addItem(items.rug_001);
    }

    setupDragAndDrop() {
        // Set up drag and drop event listeners
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('inventory-item') || e.target.classList.contains('active-item')) {
                this.showItemInfo(e.target.dataset.itemId);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('inventory-item') || e.target.classList.contains('active-item')) {
                this.removeItemInfo();
            }
        });

        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('inventory-item') || e.target.classList.contains('active-item')) {
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
        this.draggedItem = {
            id: e.target.dataset.itemId,
            type: e.target.dataset.itemType,
            element: e.target
        };

        // Determine if dragging from inventory or active items
        if (e.target.classList.contains('inventory-item')) {
            this.dragSource = 'inventory';
        } else if (e.target.classList.contains('active-item')) {
            this.dragSource = 'active';
        }

        // Add visual feedback
        e.target.style.opacity = '0.5';
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
            
            // Find the actual item object
            const itemId = this.draggedItem.id;
            let item = null;
            
            if (this.dragSource === 'inventory') {
                item = this.inventory.items.find(i => i.id === itemId);
            } else if (this.dragSource === 'active') {
                item = this.activeItems.items.find(i => i != null && i.id === itemId);
            }

            if (item) {
                // Get the index of the target container for placement
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
        // Reset visual feedback
        if (e.target.classList.contains('inventory-item') || e.target.classList.contains('active-item')) {
            e.target.style.opacity = '1';
        }
        
        this.draggedItem = null;
        this.dragSource = null;
    }

    showItemInfo(itemId) {
        const item = items[itemId];
        const itemInfoBlock = document.getElementById('item-info-block');
        itemInfoBlock.style.display = 'block';
        itemInfoBlock.innerHTML = `
            <img src="${item.image}" alt="${item.name}" title="${item.name}">
            <p>${item.description}</p>
            <p>Value: ${item.value}</p>
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
            // Moving from inventory to active items
            if (this.activeItems.isFull()) {
                console.log('Active items full');
                // TODO: SWAP ITEMS RIGHT HERE
                return;
            }
            
            this.inventory.removeItem(item);
            this.activeItems.addItem(item, placementIndex);
            
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
}

const inventoryManager = new InventoryManager();
export default inventoryManager;