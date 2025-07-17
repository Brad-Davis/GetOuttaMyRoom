class Inventory {
    constructor() {
        this.items = [];
    }
    
    addItem(item) {
        this.items.push(item);
    }

    showInventory() {
        const inventory = document.getElementById("inventory");
        inventory.style.display = "block";
    }

    hideInventory() {}
    
    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index > -1) {
        this.items.splice(index, 1);
        }
    }
    
    listItems() {
        return this.items;
    }
}

const inventory = new Inventory();
export default inventory;