/** Kitchen lives on a separate vertical plane from the bedroom (gameGroup local Y). */
export const KITCHEN_WORLD_Y = 200;
/** Floor depth along -Z (must match `createKitchen` in kitchen.js). */
export const KITCHEN_LENGTH = 15;
const KITCHEN_CONFIG = { width: 20, depth: 10, floorLevel: -3 };

const kitchenCenterZ = -KITCHEN_CONFIG.depth / 2 - KITCHEN_LENGTH / 2;

/**
 * Scroll rail value (`gameGroup.position.z`) where the static `KITCHEN_VIEW` preset
 * frames the floor center without an extra offset.
 */
export const KITCHEN_SCROLL_ALIGNED_Z = 0;

/** Standing eye position at the center of the kitchen floor (gameGroup local space). */
export function getKitchenCenter() {
    const eyeHeightAboveFloor = 3;
    return {
        x: 0,
        y: KITCHEN_WORLD_Y + KITCHEN_CONFIG.floorLevel + eyeHeightAboveFloor,
        z: kitchenCenterZ,
    };
}

/** World-space camera pose for KITCHEN_VIEW at the current scroll rail value. */
export function getKitchenCameraPosition(scrollZ = KITCHEN_SCROLL_ALIGNED_Z) {
    const center = getKitchenCenter();
    return {
        x: center.x,
        y: center.y,
        z: scrollZ + center.z,
    };
}

/** Camera preset aligned with `spawnMom` in kitchen.js (`KITCHEN_SCROLL_ALIGNED_Z`). */
export function getMomView() {
    return {
        position: {
            x: 0,
            y: KITCHEN_WORLD_Y,
            z: kitchenCenterZ,
        },
        rotation: { x: 0.05, y: -0.7, z: 0 },
    };
}
