const phyEl = document.getElementById('phy-damage-multiplier');
const emoEl = document.getElementById('emo-damage-multiplier');

function isUnityMultiplier(value) {
    return value === 1 || Math.abs(value - 1) < 0.0001;
}

function formatMultiplier(value) {
    const rounded = Math.round(value * 1000) / 1000;
    if (Number.isInteger(rounded)) {
        return String(rounded);
    }
    return rounded.toFixed(2).replace(/\.?0+$/, '');
}

function updateSide(el, multiplier) {
    if (!el) return;
    if (isUnityMultiplier(multiplier)) {
        el.hidden = true;
        return;
    }
    const valueEl = el.querySelector('.damage-multiplier__value');
    if (valueEl) {
        valueEl.textContent = `×${formatMultiplier(multiplier)}`;
    }
    el.hidden = false;
}

export function updateDamageMultiplierHud(player) {
    if (!player) return;
    updateSide(phyEl, player.phyDamage);
    updateSide(emoEl, player.emoDamage);
}

/** @param {'physical' | 'emotional'} type */
export function shakeDamageMultiplierHud(type) {
    const el = type === 'physical' ? phyEl : emoEl;
    if (!el || el.hidden) return;

    el.classList.remove('damage-multiplier--shake');
    void el.offsetWidth;
    el.classList.add('damage-multiplier--shake');
}

function onShakeAnimationEnd(e) {
    if (e.animationName !== 'damageMultiplierShake') return;
    e.currentTarget.classList.remove('damage-multiplier--shake');
}

if (phyEl) phyEl.addEventListener('animationend', onShakeAnimationEnd);
if (emoEl) emoEl.addEventListener('animationend', onShakeAnimationEnd);
