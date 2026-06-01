/**
 * Map a rail coordinate onto the bar (bedroom = left / 0%, Dad's room = right / 100%).
 * @param {number} railZ — position along the hall; equals world Z at the interior anchor (0)
 */
export function worldZToRailPercent(railZ, zMin, zMax) {
    if (railZ == null || Number.isNaN(railZ) || zMax <= zMin) return 0;
    const t = (railZ - zMin) / (zMax - zMin);
    return Math.max(0, Math.min(100, t * 100));
}

export default class SpeedBar {
    constructor(rootEl) {
        this.rootEl = rootEl;
        this.progressEl = rootEl.querySelector('#scrollSpeedBar');
        this.readoutEl = rootEl.querySelector('.speed-bar-readout');
        this.youMarkerEl = rootEl.querySelector('.speed-bar-marker--you');
        this.thirtiesMarkerEl = rootEl.querySelector('.speed-bar-marker--thirties');
    }

    show() {
        this.rootEl.hidden = false;
    }

    hide() {
        this.rootEl.hidden = true;
    }

    /**
     * @param {number} averageSpeed — smoothed world-units per scroll tick
     * @param {number} maxSpeed — value that maps to 100% fill
     * @param {{
     *   youZ?: number | null,
     *   youBounds?: { zMin: number, zMax: number },
     *   thirtiesZ?: number | null,
     *   thirtiesBounds?: { zMin: number, zMax: number },
     * }} [positions]
     */
    update(averageSpeed, maxSpeed, positions = null) {
        const pct = maxSpeed > 0 ? Math.min(100, (averageSpeed / maxSpeed) * 100) : 0;
        this.progressEl.value = pct;
        this.readoutEl.textContent = `${Math.round(pct)}%`;

        if (!positions || !this.youMarkerEl || !this.thirtiesMarkerEl) return;

        const { youZ, youBounds, thirtiesZ, thirtiesBounds } = positions;
        if (youBounds) {
            this._placeMarker(this.youMarkerEl, youZ, youBounds.zMin, youBounds.zMax);
        }
        if (thirtiesBounds) {
            this._placeMarker(
                this.thirtiesMarkerEl,
                thirtiesZ,
                thirtiesBounds.zMin,
                thirtiesBounds.zMax
            );
        }
    }

    _placeMarker(el, worldZ, zMin, zMax) {
        if (worldZ == null || Number.isNaN(worldZ)) {
            el.hidden = true;
            return;
        }
        el.hidden = false;
        el.style.left = `${worldZToRailPercent(worldZ, zMin, zMax)}%`;
    }
}
