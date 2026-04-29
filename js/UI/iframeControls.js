import iframeSites from '../config/iframeSites.js';
import cameraService from '../utils/cameraPresets.js';

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
        
        this.computer.appendChild(this.iframe);
    }

    hideIframe() {
        this.zoomOut();
        if (this.iframe.parentNode !== this.computer) {
            this.computer.appendChild(this.iframe);
        }
        this.iframe.src = 'about:blank';
        this.computer.style.display = 'none';
        this.computer.style.opacity = '0';
        cameraService.openEyes();
    }

    showIframe(url, options = {}) {
        if (!this.iframe.parentNode) {
            this.computer.appendChild(this.iframe);
        }
        this.computer.style.display = 'block';
        this.computer.style.opacity = '1';
        const allow = options.allow || 'microphone; camera; autoplay; encrypted-media';
        this.iframe.setAttribute('allow', allow);
        this.iframe.src = url;
        this.iframe.style.display = 'block';
    }

    openSite(siteKey) {
        const site = iframeSites[siteKey];
        if (!site) {
            console.warn(`No iframe site configured for key: ${siteKey}`);
            return false;
        }

        this.showIframe(site.url, { allow: site.allow });
        return true;
    }

    zoomIn() {
        const c = this.computer;
        const iframe = this.iframe;

        if (this._zoomEndTimer) {
            clearTimeout(this._zoomEndTimer);
            this._zoomEndTimer = null;
        }

        c.offsetHeight;
        const rect = c.getBoundingClientRect();
        const startBr =
            parseFloat(window.getComputedStyle(iframe).borderRadius) || 10;

        const dur = 1000;

        c.style.position = 'fixed';
        c.style.top = `${rect.top}px`;
        c.style.left = `${rect.left}px`;
        c.style.width = `${rect.width}px`;
        c.style.height = `${rect.height}px`;
        c.style.margin = '0';
        c.style.transform = 'none';
        c.style.zIndex = '1000';
        c.style.right = 'auto';
        c.style.bottom = 'auto';
        c.style.boxSizing = 'border-box';

        iframe.style.borderRadius = `${startBr}px`;
        c.style.transition = 'none';
        iframe.style.transition = 'none';
        c.offsetHeight;

        c.style.transition = `top ${dur}ms cubic-bezier(0.22, 1, 0.36, 1), left ${dur}ms cubic-bezier(0.22, 1, 0.36, 1), width ${dur}ms cubic-bezier(0.22, 1, 0.36, 1), height ${dur}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        iframe.style.transition = `border-radius ${dur}ms cubic-bezier(0.22, 1, 0.36, 1)`;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                c.style.top = '0';
                c.style.left = '0';
                c.style.width = '100vw';
                c.style.height = '100vh';
                iframe.style.borderRadius = '0px';
            });
        });

        this._zoomEndTimer = setTimeout(() => {
            c.style.transition = '';
            iframe.style.transition = '';
            this._zoomEndTimer = null;
        }, dur + 100);
    }

    zoomOut() {
        if (this._zoomEndTimer) {
            clearTimeout(this._zoomEndTimer);
            this._zoomEndTimer = null;
        }
        const c = this.computer;
        c.style.position = '';
        c.style.top = '';
        c.style.left = '';
        c.style.right = '';
        c.style.bottom = '';
        c.style.width = '';
        c.style.height = '';
        c.style.margin = '';
        c.style.transform = '';
        c.style.zIndex = '';
        c.style.transition = '';
        c.style.boxSizing = '';
        this.iframe.style.borderRadius = '';
        this.iframe.style.transform = '';
        this.iframe.style.transition = '';
    }
}

const iframeControls = new IframeControls();

const IFRAME_WAKE_MESSAGE = 'GOMR_IFRAME_WAKE_UP';

window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== IFRAME_WAKE_MESSAGE || data.v !== 1) return;
    if (event.source !== iframeControls.iframe?.contentWindow) return;
    iframeControls.hideIframe();
});

export default iframeControls;