import iframeSites from '../config/iframeSites.js';
import { getInitialComputerPhase } from '../config/gameFlow.js';
import cameraService from '../utils/cameraPresets.js';
import backButtonManager from '../controls/backButton.js';
import speakButtonManager from '../controls/speakButton.js';
import dialogService from '../utils/dialogService.js';
import missionService from '../utils/missionService.js';
import dopamineManager from '../managers/dopamineManager.js';
import audioService from '../utils/audioService.js';

export const IFRAME_WAKE_MESSAGE = 'GOMR_IFRAME_WAKE_UP';

/** Please Wake Up Daddy mini-game: wake video finished — return to kitchen. */
export const IFRAME_DADDY_WAKE_MESSAGE = 'GOMR_DADDY_WAKE_UP';

/** Computer iframe only: close iframe and deliver textarea text to `setComputerSubmitCallback`. */
export const IFRAME_COMPUTER_SUBMIT_MESSAGE = 'GOMR_COMPUTER_SUBMIT';

/** Evil Tinder iframe: player got a mutual match (award dopamine). */
export const IFRAME_TINDER_MATCH_MESSAGE = 'GOMR_TINDER_MATCH';

/** Body class: shifts #backButton / #mission-hud right of the Evil Tinder sidebar. */
const EVIL_TINDER_HUD_BODY_CLASS = 'evil-tinder-iframe-open';

/** Body class: keeps #backButton above fullscreen #computer iframe (z-index 10000). */
const FULLSCREEN_IFRAME_HUD_BODY_CLASS = 'fullscreen-iframe-open';

/** Body class: shifts #backButton right of Noise Between Static menu control (☰). */
const NOISE_BETWEEN_STATIC_HUD_BODY_CLASS = 'noise-between-static-iframe-open';

function isEvilTinderUrl(url) {
    return typeof url === 'string' && url.includes('/evilTinder/');
}

function isNoiseBetweenStaticUrl(url) {
    if (typeof url !== 'string') return false;
    return (
        url.includes('/noiseBetweenStatic/') ||
        /noisebetweenstatic\.com/i.test(url)
    );
}

/** These iframes keep ambient BGM; everything else fades it out. */
function keepsBackgroundMusic(url) {
    if (typeof url !== 'string') return false;
    return (
        url.includes('/evilTinder/') ||
        url.includes('/evilLinkedIn/') ||
        url.includes('/evilYoutube/') ||
        url.includes('/thoseWhoAreRemebered/')
    );
}

const DEFAULT_IFRAME_SANDBOX =
    'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation';

/** Noise Between Static: block popups so nested YouTube embeds cannot open new tabs. */
const NOISE_BETWEEN_STATIC_IFRAME_SANDBOX =
    'allow-scripts allow-same-origin allow-forms allow-modals allow-presentation';

function getIframeSandboxForUrl(url) {
    if (isNoiseBetweenStaticUrl(url)) return NOISE_BETWEEN_STATIC_IFRAME_SANDBOX;
    return DEFAULT_IFRAME_SANDBOX;
}

const DEFAULT_IFRAME_ALLOW =
    'microphone *; camera *; autoplay *; encrypted-media *; fullscreen *; speaker-selection *';

/** Origins allowed to close the computer iframe via postMessage (plus same origin). */
function isAllowedComputerIframeOrigin(origin) {
    if (origin === window.location.origin) return true;
    try {
        const host = new URL(origin).hostname.replace(/^www\./, '');
        return host === 'daddywakeup.com';
    } catch {
        return false;
    }
}

class IframeControls {
    constructor() {
        this._computerSubmitCallback = null;
        /** Bumped on hide/zoomOut so stale zoomIn rAF callbacks no-op. */
        this._zoomGeneration = 0;
        /** `Computer` game object (setFrame, etc.) — not the `#computer` DOM node. */
        this._computerInstance = null;
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
        this.iframe.setAttribute('allow', DEFAULT_IFRAME_ALLOW);
        this.iframe.setAttribute('sandbox', DEFAULT_IFRAME_SANDBOX);
        
        this.computer.appendChild(this.iframe);
    }

    _setEvilTinderHudLayout(active) {
        document.body.classList.toggle(EVIL_TINDER_HUD_BODY_CLASS, Boolean(active));
    }

    _setFullscreenIframeHudLayout(active) {
        document.body.classList.toggle(FULLSCREEN_IFRAME_HUD_BODY_CLASS, Boolean(active));
    }

    _setNoiseBetweenStaticHudLayout(active) {
        document.body.classList.toggle(NOISE_BETWEEN_STATIC_HUD_BODY_CLASS, Boolean(active));
    }

    isOpen() {
        if (!this.computer) return false;
        return (
            this.computer.style.display !== 'none' &&
            this.computer.style.opacity !== '0'
        );
    }

    async hideIframe(firstTime = false) {
        this._zoomGeneration += 1;
        this._setEvilTinderHudLayout(false);
        this._setFullscreenIframeHudLayout(false);
        this._setNoiseBetweenStaticHudLayout(false);
        this.zoomOut();
        if (this.iframe.parentNode !== this.computer) {
            this.computer.appendChild(this.iframe);
        }
        this.iframe.src = 'about:blank';
        this.iframe.setAttribute('sandbox', DEFAULT_IFRAME_SANDBOX);
        this.iframe.setAttribute('allow', DEFAULT_IFRAME_ALLOW);
        this.computer.style.display = 'none';
        this.computer.style.opacity = '0';
        this.computer.style.pointerEvents = 'none';
        backButtonManager.updateVisibility();
        if (firstTime) {
            setTimeout(async () => {
                cameraService.openEyes();
                setTimeout(async () => {
                    await this.runWakeStartup(getInitialComputerPhase());
                }, 1000);
            }, 1000);
        }
    }

    /**
     * Preload mini-game in the dresser iframe while the HUD stays hidden (wake / checkpoint).
     */
    primeComputerSrc(url) {
        if (!url || !this.iframe) return;
        if (this.iframe.parentNode !== this.computer) {
            this.computer.appendChild(this.iframe);
        }
        const externalEmbed = /^https?:\/\//i.test(url);
        if (externalEmbed) {
            this.iframe.removeAttribute('sandbox');
        } else {
            this.iframe.setAttribute('sandbox', getIframeSandboxForUrl(url));
        }
        this.iframe.setAttribute('allow', DEFAULT_IFRAME_ALLOW);
        if (this.iframe.src !== url) {
            this.iframe.src = url;
        }
        this.computer.style.display = 'none';
        this.computer.style.opacity = '0';
        this.computer.style.pointerEvents = 'none';
    }

    async runWakeStartup(phase) {
        if (phase === 'tinder') return this.tinderStartup();
        if (phase === 'youtube') return this.youtubeStartup();
        return this.linkedInStartup();
    }

    async linkedInStartup() {
        this._computerInstance?.setFrame('linkedin');
        this._computerInstance?.primeIframe?.();
        await dialogService.runLines([
            {
                speaker: 'Inner Monologue',
                text: 'You have no dopamine or self worth. Your body is telling you to post on LinkedIn.',
            }
        ]);
        backButtonManager.enable();
        speakButtonManager.enable();
        missionService.setCurrentMission('Post on LinkedIn on your computer to get dopamine.');
    }

    async tinderStartup() {
        this._computerInstance?.setFrame('tinder');
        this._computerInstance?.primeIframe?.();
        await dialogService.runLines([
            {
                speaker: 'Inner Monologue',
                text: 'You have no dopamine or sex appeal. Your body is telling you to swipe on Tinder.',
            }
        ]);
        backButtonManager.enable();
        speakButtonManager.enable();
        missionService.setCurrentMission('Swipe on Tinder to get dopamine.');
    }

    async youtubeStartup() {
        this._computerInstance?.setFrame('youtube');
        this._computerInstance?.primeIframe?.();
        await dialogService.runLines([
            {
                speaker: 'Inner Monologue',
                text: 'You have no dopamine but a bunch of anger. Your body is telling you to comment on Youtube.',
            }
        ]);
        backButtonManager.enable();
        speakButtonManager.enable();
        missionService.setCurrentMission('Post on Youtube to get dopamine.');
    }

    showIframe(url, options = {}) {
        if (!this.iframe.parentNode) {
            this.computer.appendChild(this.iframe);
        }
        this.computer.style.display = 'block';
        this.computer.style.opacity = '1';
        this.computer.style.pointerEvents = 'auto';
        const allow = options.allow ?? DEFAULT_IFRAME_ALLOW;
        this.iframe.setAttribute('allow', allow);
        if (options.externalEmbed) {
            this.iframe.removeAttribute('sandbox');
        } else {
            this.iframe.setAttribute('sandbox', getIframeSandboxForUrl(url));
        }
        this.iframe.src = url;
        this.iframe.style.display = 'block';
        this._setEvilTinderHudLayout(isEvilTinderUrl(url));
        this._setNoiseBetweenStaticHudLayout(isNoiseBetweenStaticUrl(url));
        if (!keepsBackgroundMusic(url)) {
            audioService.fadeOutBackgroundMusic();
        }
    }

    /** Show an iframe URL and zoom to fullscreen (same pattern as movement / CD flows). */
    openIframe(url, options = {}) {
        this.showIframe(url, options);
        backButtonManager.enable();
        this._setFullscreenIframeHudLayout(true);
        backButtonManager.showBackButton();
        this.zoomIn(true);
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

    zoomIn(opening = false) {
        const c = this.computer;
        const iframe = this.iframe;
        const gen = ++this._zoomGeneration;

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
        if (opening){
            c.style.zIndex = '10000';
        } else {
            c.style.zIndex = '1000';
        }
       
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
                if (gen !== this._zoomGeneration) return;
                c.style.top = '0';
                c.style.left = '0';
                c.style.width = '100vw';
                c.style.height = '100vh';
                iframe.style.borderRadius = '0px';
            });
        });

        this._zoomEndTimer = setTimeout(() => {
            if (gen !== this._zoomGeneration) return;
            c.style.transition = '';
            iframe.style.transition = '';
            this._zoomEndTimer = null;
        }, dur + 100);
    }

    /** Called after the computer iframe posts GOMR_COMPUTER_SUBMIT with the textarea value. */
    setComputerSubmitCallback(fn) {
        this._computerSubmitCallback = typeof fn === 'function' ? fn : null;
    }

    setComputerInstance(computer) {
        this._computerInstance = computer ?? null;
    }

    zoomOut() {
        this._zoomGeneration += 1;
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

window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object' || data.v !== 1) return;
    if (event.source !== iframeControls.iframe?.contentWindow) return;
    if (!isAllowedComputerIframeOrigin(event.origin)) return;

    if (data.type === IFRAME_COMPUTER_SUBMIT_MESSAGE) {
        const text = typeof data.text === 'string' ? data.text : '';
        // Submit path: do not run first-time "close iframe" monologue/mission reset (that fights LinkedIn grading dialogs).
        void iframeControls.hideIframe(false).then(() => {
            iframeControls._computerSubmitCallback?.(text);
        });
        return;
    }

    if (data.type === IFRAME_TINDER_MATCH_MESSAGE) {
        dopamineManager.giveDopamine(5);
        return;
    }

    if (data.type === IFRAME_WAKE_MESSAGE) {
        iframeControls.hideIframe(true);
        return;
    }

    if (data.type === IFRAME_DADDY_WAKE_MESSAGE) {
        void iframeControls.hideIframe(false);
        window.gameEngine?.getInteractionManager?.()?.getMovement?.()?.finishDaddyWakeGame?.();
        return;
    }
});

export default iframeControls;