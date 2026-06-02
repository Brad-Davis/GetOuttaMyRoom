/** Kitchen lives on a separate vertical plane from the bedroom (gameGroup local Y). */
export const KITCHEN_WORLD_Y = 200;
/** Floor depth along -Z (must match `createKitchen` in kitchen.js). */
export const KITCHEN_LENGTH = 15;
const KITCHEN_CONFIG = { width: 20, depth: 10, floorLevel: -3 };

/** Standing eye position at the center of the kitchen floor (gameGroup space). */
export function getKitchenCenter() {
    const kitchenCenterZ = -KITCHEN_CONFIG.depth / 2 - KITCHEN_LENGTH / 2;
    const eyeHeightAboveFloor = 3;
    return {
        x: 0,
        y: KITCHEN_WORLD_Y + KITCHEN_CONFIG.floorLevel + eyeHeightAboveFloor,
        z: kitchenCenterZ,
    };
}
