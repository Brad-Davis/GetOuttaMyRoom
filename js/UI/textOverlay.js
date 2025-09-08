import interactionService from "../utils/interactionService.js";

class TextOverlay {
    constructor() {
        this.overlay = document.getElementById('overlay');
        this.fullOverlay = document.getElementById('full-overlay');
        this.bottomOverlay = document.getElementById('bottom-overlay');
        this.windowOverlay = document.getElementById('window-overlay');
        this.dialogueOverlay = document.getElementById('dialogue-overlay');
        this.dialogueBox = document.getElementById('dialogue-box');
        this.dialogueTriangle = document.getElementById('dialogue-triangle');
        this.bottomText = '[Click on the CD to start]';
        this.fullText = '';
        this.isVisible = true;
        this.blink('1');
        this.show("bottom");
        // this.showTextBox("HELLO THIS IS MY FIRST TEXT BOX HELLO THIS IS MY FIRST TEXT BOX HELLO THIS IS MY FIRST TEXT BOX HELLO THIS IS MY FIRST TEXT BOX HELLO THIS IS MY FIRST TEXT BOX");
    }

    show(element) {
        this.isVisible = true;
        this.overlay.style.display = 'block';
        this.overlay.style.opacity = '1';
        if (element === 'bottom') {
            this.bottomOverlay.style.display = 'block';
            this.windowOverlay.style.display = 'none';
            this.fullOverlay.style.display = 'none';
            this.dialogueOverlay.style.display = 'none';
        } else if (element === 'full') {
            this.fullOverlay.style.display = 'block';
            this.windowOverlay.style.display = 'none';
            this.bottomOverlay.style.display = 'none';
            this.dialogueOverlay.style.display = 'none';
        } else if (element === 'window') {
            this.windowOverlay.style.display = 'block';
            this.bottomOverlay.style.display = 'none';
            this.fullOverlay.style.display = 'none';
            this.dialogueOverlay.style.display = 'none';
        } else if (element === 'dialogue') {
            this.dialogueOverlay.style.display = 'block';
            this.bottomOverlay.style.display = 'none';
            this.fullOverlay.style.display = 'none';
            this.windowOverlay.style.display = 'none';
        }
    }

    hide() {
        this.isVisible = false;
        this.overlay.style.display = 'none';
    }

    blink(opacity) {
        this.overlay.style.display = 'block';
        this.overlay.style.opacity = opacity;
        setTimeout(() => {
            if (!this.isVisible) return;
            this.overlay.style.opacity = opacity === '1' ? '0' : '1';
            this.blink(opacity === '1' ? '0' : '1');
        }, 1000);
    }

    showWindowOverlay(message, title, buttons, buttonFunctions) {
        interactionService.disable();
        this.windowOverlay.querySelector('#window-message').textContent = message;
        this.windowOverlay.querySelector('#window-title').textContent = title;
        this.windowOverlay.querySelector('#window-buttons').innerHTML = buttons.map(button => `<button>${button}</button>`).join('');
        setTimeout(() => {
            this.windowOverlay.querySelectorAll('#window-buttons button').forEach((button, index) => {
                button.addEventListener('click', () => buttonFunctions[index]());
            });
            this.show("window");
        }, 10);
        
    }
    
    closeWindowOverlay() {
        this.windowOverlay.style.display = 'none';
        interactionService.enable();
        this.hide();
    }

    showTextBox(message) {
        this.show('dialogue');
        this.dialogueOverlay
        this.startTextScroll(message);
        this.dialogueOverlay.style.pointerEvents = 'auto';
        const clickHandler = () => {
            console.log('clicked');
            this.dialogueBox.textContent = message + "   ";
            this.dialogueOverlay.removeEventListener('click', clickHandler);
            this.showSolidTriangle();
        };
        this.dialogueOverlay.addEventListener('click', clickHandler);
    }

    startTextScroll(message) {
        let textLength = this.dialogueBox.textContent.length;
        this.showFlashingTriangle();
        if (textLength < message.length) {
            this.dialogueBox.textContent = message.substring(0, textLength + 1);
            setTimeout(() => {
                this.startTextScroll(message);
            }, 20);
        } else {
            this.showSolidTriangle();
        }
    }

    showFlashingTriangle() {
        this.dialogueTriangle.classList.add('flashing');
    }

    showSolidTriangle() {
        this.dialogueTriangle.classList.remove('flashing');
    }
}

const textOverlay = new TextOverlay();
export default textOverlay;