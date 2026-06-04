const LOADING_DISCLAIMERS = [
    "Disclaimer: this game was made by a gay, so you are supporting queer art right now. he is homophobic tho womp womp",
    "Disclaimer: this game kinda smells bad. Sorry bout that.",
    "Fun fact: I wanted to display this game in the bathroom but Aaron said no so now it's here.",
    "Fun fact: ONX told me if this game isn't good they would bully me.",
    "Fun fact: I made this game all in javascript so it's probably gonna break",
    "Hit the bong three times I dare you.",
]
function initInitialLoadingDisclaimer() {
    const el = document.getElementById('initial-loading-disclaimer');
    if (!el || LOADING_DISCLAIMERS.length === 0) return;
    el.textContent = LOADING_DISCLAIMERS[Math.floor(Math.random() * LOADING_DISCLAIMERS.length)];
}

initInitialLoadingDisclaimer();

/** Single place so SKIP_INTRO (and loaders) can dismiss before blocking dialogs. */
export function dismissInitialLoadingScreen() {
    const el = document.getElementById('initial-loading-screen');
    if (!el || el.dataset.dismissed === '1') return;
    el.dataset.dismissed = '1';
    el.setAttribute('aria-busy', 'false');

    const finalize = () => {
        el.remove();
    };

    el.classList.add('initial-loading-screen--exit');
    el.addEventListener('transitionend', finalize, { once: true });
    setTimeout(finalize, 520);
}
