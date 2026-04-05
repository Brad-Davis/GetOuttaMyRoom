

class IframeControls {
    constructor() {
        this.iframe = document.getElementById('iframe');
        if (!this.iframe) {
            this.iframe = document.createElement('iframe');
        }
        this.computer = document.getElementById('computer');
        this.computer.style.display = 'none';
        this.computer.innerHTML = '';
        this.computer.style.opacity = '0';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        this.iframe.style.borderRadius = '10px';
        this.iframe.style.overflow = 'hidden';
        this.iframe.style.boxShadow = '0 0 10px 0 rgba(0, 0, 0, 0.5)';
        
        // Enable audio, microphone, and other media permissions
        this.iframe.setAttribute('allow', 'microphone *; camera *; autoplay *; encrypted-media *; fullscreen *; speaker-selection *');
        this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation');
        
        computer.appendChild(this.iframe);
    }

    hideIframe() {
        this.computer.style.display = 'none';
        computer.innerHTML = '';
        this.computer.style.opacity = '0';
    }

    showIframe(url) {
        this.computer.style.display = 'block';
        this.computer.style.opacity = '0';
        setTimeout(() => {
            this.computer.style.opacity = '1';
        }, 1000);
        this.iframe.setAttribute('allow', 'microphone; camera; autoplay; encrypted-media');
        this.iframe.src = url;
        this.iframe.style.display = 'block';
    }
}

const iframeControls = new IframeControls();
export default iframeControls;