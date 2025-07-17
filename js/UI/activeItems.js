class ActiveItems {
    constructor() {
        this.items = [];
        this.size = 2;
    }
    
    addItem(item) {
        this.items.push(item);
    }

    removeItem(item) {
        this.items = this.items.filter(i => i !== item);
    }
}

const activeItems = new ActiveItems();
export default activeItems;