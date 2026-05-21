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
