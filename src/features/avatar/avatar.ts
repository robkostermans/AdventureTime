// Avatar feature implementation

import { createElement, injectStyles } from "../../core/utils";
import type { CleanupFunction, Vector2D } from "../../core/types";
import type { AvatarFeatureConfig, AvatarState } from "./types";

let isInitialized = false;
let config: AvatarFeatureConfig;
let avatarElement: HTMLDivElement | null = null;
let avatarState: AvatarState = {
  offset: { x: 0, y: 0 },
  rotation: 0,
  targetOffset: { x: 0, y: 0 },
  targetRotation: 0,
};
let animationFrameId: number | null = null;
let cleanupFunctions: CleanupFunction[] = [];

const AVATAR_ID = "adventure-time-avatar";
const AVATAR_STYLES_ID = "adventure-time-avatar-styles";

export function initAvatar(featureConfig: AvatarFeatureConfig): void {
  if (isInitialized) {
    console.warn("Avatar already initialized");
    return;
  }

  config = {
    enabled: true,
    debug: false,
    maxOffset: 32,
    offsetSmoothing: 0.15,
    rotationEnabled: true,
    ...featureConfig,
  };

  if (!config.enabled) {
    return;
  }

  // Reset state
  avatarState = {
    offset: { x: 0, y: 0 },
    rotation: 0,
    targetOffset: { x: 0, y: 0 },
    targetRotation: 0,
  };

  // Inject avatar styles
  const styleCleanup = injectStyles(
    getAvatarStyles(config.size, config.color, config.shape),
    AVATAR_STYLES_ID
  );
  cleanupFunctions.push(styleCleanup);

  // Create avatar element
  avatarElement = createAvatarElement();
  document.body.appendChild(avatarElement);

  cleanupFunctions.push(() => {
    avatarElement?.remove();
  });

  // Start animation loop for smooth transitions
  startAnimationLoop();

  isInitialized = true;

  if (config.debug) {
    console.log("Avatar initialized", config);
  }
}

export function destroyAvatar(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  avatarElement = null;
  avatarState = {
    offset: { x: 0, y: 0 },
    rotation: 0,
    targetOffset: { x: 0, y: 0 },
    targetRotation: 0,
  };
  isInitialized = false;
}

export function getAvatarElement(): HTMLDivElement | null {
  return avatarElement;
}

/**
 * Updates the avatar's movement direction for rotation and offset feedback.
 * Called by the input system when movement occurs.
 * @param direction - The normalized direction vector (not inverted, represents avatar's perceived direction)
 * @param velocityFactor - 0-1 representing current speed as fraction of max speed
 */
export function updateAvatarMovement(direction: Vector2D, velocityFactor: number = 1): void {
  if (!isInitialized) return;

  // Calculate target offset scaled by velocity factor
  // This syncs avatar offset with world acceleration/deceleration
  avatarState.targetOffset = {
    x: direction.x * config.maxOffset * velocityFactor,
    y: direction.y * config.maxOffset * velocityFactor,
  };

  // Calculate target rotation based on movement direction
  // Only update rotation when actually moving (not during deceleration to zero)
  if (config.rotationEnabled && (direction.x !== 0 || direction.y !== 0)) {
    // Calculate angle in degrees from direction vector
    // 0° = up, 90° = right, 180° = down, 270° = left
    const angleRad = Math.atan2(direction.x, -direction.y);
    avatarState.targetRotation = angleRad * (180 / Math.PI);
  }
}

/**
 * Signals that movement has stopped, causing avatar to return to center.
 */
export function stopAvatarMovement(): void {
  if (!isInitialized) return;

  avatarState.targetOffset = { x: 0, y: 0 };
  // Keep the last rotation - don't reset targetRotation
}

/**
 * Gets the current avatar state for debugging or external use.
 */
export function getAvatarState(): AvatarState {
  return { ...avatarState };
}

function startAnimationLoop(): void {
  const animate = () => {
    updateAvatarTransform();
    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);
}

function updateAvatarTransform(): void {
  if (!avatarElement) return;

  // Smoothly interpolate offset toward target (ease-out effect)
  avatarState.offset.x += (avatarState.targetOffset.x - avatarState.offset.x) * config.offsetSmoothing;
  avatarState.offset.y += (avatarState.targetOffset.y - avatarState.offset.y) * config.offsetSmoothing;

  // Smoothly interpolate rotation toward target
  // Handle angle wrapping for smooth rotation
  let rotationDiff = avatarState.targetRotation - avatarState.rotation;
  
  // Normalize to -180 to 180 range for shortest path rotation
  while (rotationDiff > 180) rotationDiff -= 360;
  while (rotationDiff < -180) rotationDiff += 360;
  
  avatarState.rotation += rotationDiff * config.offsetSmoothing;

  // Apply transform
  // Base transform centers the avatar, then we add offset and rotation
  const transform = `translate(calc(-50% + ${avatarState.offset.x}px), calc(-50% + ${avatarState.offset.y}px)) rotate(${avatarState.rotation}deg)`;
  avatarElement.style.transform = transform;
}

function createAvatarElement(): HTMLDivElement {
  const avatar = createElement(
    "div",
    { id: AVATAR_ID, class: "at-avatar" },
    {}
  );

  // Add a simple face to the avatar for visual interest
  // The face helps show rotation direction
  const face = createElement("div", { class: "at-avatar-face" }, {});
  avatar.appendChild(face);

  return avatar;
}

function getAvatarStyles(
  size: number,
  color: string,
  shape: "circle" | "square"
): string {
  const borderRadius = shape === "circle" ? "50%" : "4px";

  return `
    .at-avatar {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${borderRadius};
      z-index: 1000000;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: box-shadow 0.2s ease;
    }

    .at-avatar-face {
      width: 60%;
      height: 60%;
      position: relative;
    }

    /* Eyes */
    .at-avatar-face::before,
    .at-avatar-face::after {
      content: '';
      position: absolute;
      width: 6px;
      height: 6px;
      background: #333;
      border-radius: 50%;
      top: 25%;
    }

    .at-avatar-face::before {
      left: 20%;
    }

    .at-avatar-face::after {
      right: 20%;
    }
  `;
}
