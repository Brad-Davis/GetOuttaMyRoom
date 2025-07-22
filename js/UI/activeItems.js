class ActiveItems {
    constructor() {
        this.items = [null, null];
        this.size = 2;
    }
    
    addItem(item, placementIndex) {
        if (this.items[placementIndex] === null) {
            this.items[placementIndex] = item;
            this.renderItems();
            return true;
        }
        return false;
    }

    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items[index] = null;
        }
        this.renderItems();
    }

    renderItems() {
        const containers = document.querySelectorAll('.active-item-container');
        
        // Clear all containers
        containers.forEach(container => {
            container.innerHTML = '';
            container.classList.remove('has-item');
        });
        
        console.log(this.items);
        // Render items
        this.items.forEach((item, index) => {
            if (index < containers.length && item !== null) {
                const container = containers[index];
                container.innerHTML = `
                    <div class="active-item" draggable="true" data-item-id="${item.id}" data-item-type="${item.type}">
                        <img src="${item.image}" alt="${item.name}" title="${item.name}">
                    </div>
                `;
                container.classList.add('has-item');
            }
        });
        this.tickItems(0.1);
    }

    isFull() {
        return this.items.filter(item => item !== null).length >= this.size;
    }

    tickItems(timeAmount) {
        const activeItems = document.getElementById('active-items').children;

        this.items.forEach((item, index) => {
            if (item !== null) {
                item.tick(timeAmount, index, activeItems);
            } else {
                activeItems[index + 1].style.background = `rgba(192, 192, 192, 0)`;
            }
        });
        setTimeout(() => {
            this.tickItems(0.1);
        }, 100);
    }
}

const activeItems = new ActiveItems();
export default activeItems;