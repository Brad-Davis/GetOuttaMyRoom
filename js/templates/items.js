class Item {
    constructor(name, description, value, rechargeTime = 0) {
        this.name = name;
        this.description = description;
        this.value = value;
        this.image = null; // Placeholder for item image
        this.rechargeTime = rechargeTime; // Time until the item can be used again
    }

    use() {
        console.log(`${this.name} is used.`);
    }
}

class Weapon extends Item {
    constructor(name, description, value, rechargeTime, triggerFunction, phyDamage, emoDamage = 0) {
        super(name, description, value, rechargeTime);
        this.triggerFunction = triggerFunction; // Function to execute on use
        this.phyDamage = phyDamage;
        this.emoDamage = emoDamage;
    }

    use() {
        if (this.triggerFunction) {
            this.triggerFunction();
        }
    }
}

class Buffer extends Item {
    constructor(name, description, value, rechargeTime, healing, phyMult, emoMult) {
        super(name, description, value, rechargeTime);
        this.healing = healing;
        this.phyMult = phyMult || 1; // Default to 1 if not provided
        this.emoMult = emoMult || 1; // Default to 1 if not provided
        this.healing = healing;
    }

    use() {
        console.log(`${this.name} restores ${this.healing} health.`);
    }
}

const items = {
    "punch": new Weapon(
        "Punch",
        "A basic punch that deals physical damage.",
        2,
        5,
        () => {
            
        },
        10
    ),

}

