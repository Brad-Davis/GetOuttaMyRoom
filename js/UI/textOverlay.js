import interactionService from "../utils/interactionService.js";

class TextOverlay {
    constructor() {
        this.overlay = document.getElementById('overlay');
        this.fullOverlay = document.getElementById('full-overlay');
        this.bottomOverlay = document.getElementById('bottom-overlay');
        this.windowOverlay = document.getElementById('window-overlay');
        this.bottomText = '[Click on the CD to start]';
        this.fullText = '';
        this.isVisible = true;
        this.blink('1');
    }

    show(element) {
        this.isVisible = true;
        this.overlay.style.display = 'block';
        this.overlay.style.opacity = '1';
        if (element === 'bottom') {
            this.bottomOverlay.style.display = 'block';
            this.windowOverlay.style.display = 'none';
            this.fullOverlay.style.display = 'none';
        } else if (element === 'full') {
            this.fullOverlay.style.display = 'block';
            this.windowOverlay.style.display = 'none';
            this.bottomOverlay.style.display = 'none';
        } else if (element === 'window') {
            this.windowOverlay.style.display = 'block';
            this.bottomOverlay.style.display = 'none';
            this.fullOverlay.style.display = 'none';
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

    showEnemyTextBox(message, speaker, position, size, timeOnScreen ) {

    }
}

const textOverlay = new TextOverlay();
export default textOverlay;