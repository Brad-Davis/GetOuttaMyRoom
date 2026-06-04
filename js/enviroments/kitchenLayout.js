/** Kitchen lives on a separate vertical plane from the bedroom (gameGroup local Y). */
export const KITCHEN_WORLD_Y = 200;
/** Floor depth along -Z (must match `createKitchen` in kitchen.js). */
export const KITCHEN_LENGTH = 15;
const KITCHEN_CONFIG = { width: 20, depth: 10, floorLevel: -3 };

const kitchenCenterZ = -KITCHEN_CONFIG.depth / 2 - KITCHEN_LENGTH / 2;

/** Offsets from `backWallZ` — keep in sync with `kitchen.js` `_loadOutsideBeyondDoor`. */
const OUTSIDE_MODEL_Z_OFFSET = 498;
const OUTSIDE_VIDEO_Z_OFFSET = 222;
/** Extra scroll past the video plane before the behind-screen door opens. */
const KITCHEN_ENDING_TRIGGER_MARGIN = 120;
/** Small headroom so the rail can reach the trigger threshold cleanly. */
const KITCHEN_ENDING_SCROLL_BUFFER = 8;
/** Local -Z offset from the video plane to the giant end door. */
const BEHIND_SCREEN_DOOR_Z_OFFSET = 1000;

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

/** Local Z of the tiled outside video backdrop (child of the kitchen group on gameGroup). */
export function getOutsideVideoScreenLocalZ() {
    const backWallZ = kitchenCenterZ - KITCHEN_LENGTH / 2;
    return backWallZ - OUTSIDE_MODEL_Z_OFFSET - OUTSIDE_VIDEO_Z_OFFSET;
}

/** Local Z of the giant door behind the outside video backdrop. */
export function getBehindScreenDoorLocalZ() {
    return getOutsideVideoScreenLocalZ() - BEHIND_SCREEN_DOOR_Z_OFFSET;
}

/**
 * `gameGroup.position.z` once the video screen has passed the kitchen camera.
 * @param {number} [cameraZ] — world camera Z (defaults to {@link getKitchenCenter} eye Z).
 */
export function getKitchenPastScreenScrollZ(cameraZ = getKitchenCenter().z) {
    return cameraZ - getOutsideVideoScreenLocalZ();
}

/**
 * `gameGroup.position.z` where the behind-screen door sequence should start
 * (video screen has cleared the camera, then extra scroll behind it).
 *
 * @param {number} [cameraZ] — world camera Z (defaults to {@link getKitchenCenter} eye Z).
 */
export function getKitchenEndingTriggerScrollZ(cameraZ = getKitchenCenter().z) {
    return getKitchenPastScreenScrollZ(cameraZ) + KITCHEN_ENDING_TRIGGER_MARGIN;
}

/**
 * Max `gameGroup.position.z` in the kitchen chapter (kitchen rides on gameGroup).
 *
 * @param {number} [cameraZ] — world camera Z to clear (defaults to {@link getKitchenCenter} eye Z).
 */
export function getKitchenMaxGameGroupZ(cameraZ = getKitchenCenter().z) {
    return getKitchenEndingTriggerScrollZ(cameraZ) + KITCHEN_ENDING_SCROLL_BUFFER;
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
