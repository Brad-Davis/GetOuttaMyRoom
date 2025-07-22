class Inventory {
    constructor() {
        this.items = [];
    }
    
    addItem(item) {
        this.items.push(item);
        this.renderItems();
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
            this.renderItems();
        }
    }
    
    listItems() {
        return this.items;
    }

    renderItems() {
        const containers = document.querySelectorAll('.inventory-item-container');
        
        // Clear all containers
        containers.forEach(container => {
            container.innerHTML = '';
            container.classList.remove('has-item');
        });
        
        // Render items
        this.items.forEach((item, index) => {
            if (index < containers.length) {
                const container = containers[index];
                container.innerHTML = `
                    <div class="inventory-item" draggable="true" data-item-id="${item.id}" data-item-type="${item.type}">
                        <img src="${item.image}" alt="${item.name}" title="${item.name}">
                    </div>
                `;
                container.classList.add('has-item');
            }
        });
    }
}

const inventory = new Inventory();
export default inventory;