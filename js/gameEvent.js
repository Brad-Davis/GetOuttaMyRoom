

class GameEvent {
    constructor(name, type, miniEvents) {
        this.name = name;
        this.type = type; // home, battle, event
        this.miniEvents = miniEvents;
        this.enemy = enemy;
        this.completed = false;
        this.active = false;
    }

    start() {
        this.active = true;
        this.miniEvents[0].start();
    }

    complete() {
        this.active = false;
        this.completed = true;
    }
}

class MiniEvent {
    constructor(type, text) {
        this.type = type; // dialog, item, 
        this.text = text;
    }

    start() {
        this.active = true;
    }
}

export default GameEvent;