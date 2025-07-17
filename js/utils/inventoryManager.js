import inventory from "../UI/inventory.js";
import activeItems from "../UI/activeItems.js";

class InventoryManager {
    constructor() {
        this.inventory = inventory;
        this.activeItems = activeItems;
        this.inventoryContainer = document.getElementById("inventory-container");
        this.inventoryButton = document.getElementById("inventory-button");
        this.inventoryItems = document.getElementById("inventory-items");
        this.inventoryVisible = false;

        this.inventoryButton.addEventListener("click", () => {
            if (this.inventoryVisible) {
                this.hideInventory();
            } else {
                this.showInventory();
            }
        });
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