// Avatar feature implementation

import { createElement, injectStyles } from "../../core/utils";
import type { CleanupFunction, Vector2D } from "../../core/types";
import type { AvatarFeatureConfig, AvatarState } from "./types";
import { getViewportContainer } from "../viewport";
import { getIconSvg } from "../../core/icons";
import avatarStyles from "./avatar.css?inline";

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
    debug: false,
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

  // Inject avatar styles from CSS module
  const styleCleanup = injectStyles(avatarStyles, AVATAR_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create avatar element
  avatarElement = createAvatarElement();
  
  // Set CSS variable for avatar size
  avatarElement.style.setProperty("--at-avatar-size", `${config.size}px`);
  
  // Append to viewport container so it shares stacking context with inventory
  const viewportContainer = getViewportContainer();
  const container = viewportContainer || document.body;
  container.appendChild(avatarElement);

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

// Threshold for considering values "settled" (to avoid endless micro-updates)
const SETTLE_THRESHOLD = 0.01;

function startAnimationLoop(): void {
  const animate = () => {
    updateAvatarTransform();
    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);
}

function updateAvatarTransform(): void {
  if (!avatarElement) return;

  // Calculate deltas
  const offsetDeltaX = avatarState.targetOffset.x - avatarState.offset.x;
  const offsetDeltaY = avatarState.targetOffset.y - avatarState.offset.y;
  
  // Handle angle wrapping for smooth rotation
  let rotationDiff = avatarState.targetRotation - avatarState.rotation;
  while (rotationDiff > 180) rotationDiff -= 360;
  while (rotationDiff < -180) rotationDiff += 360;

  // Check if we're already settled (no significant change needed)
  const isSettled = 
    Math.abs(offsetDeltaX) < SETTLE_THRESHOLD &&
    Math.abs(offsetDeltaY) < SETTLE_THRESHOLD &&
    Math.abs(rotationDiff) < SETTLE_THRESHOLD;

  if (isSettled) {
    // Snap to exact target values to avoid floating point drift
    if (avatarState.offset.x !== avatarState.targetOffset.x ||
        avatarState.offset.y !== avatarState.targetOffset.y ||
        avatarState.rotation !== avatarState.targetRotation) {
      avatarState.offset.x = avatarState.targetOffset.x;
      avatarState.offset.y = avatarState.targetOffset.y;
      avatarState.rotation = avatarState.targetRotation;
      applyTransform();
    }
    return; // Skip update - avatar is at rest
  }

  // Smoothly interpolate offset toward target (ease-out effect)
  avatarState.offset.x += offsetDeltaX * config.offsetSmoothing;
  avatarState.offset.y += offsetDeltaY * config.offsetSmoothing;

  // Smoothly interpolate rotation toward target
  avatarState.rotation += rotationDiff * config.offsetSmoothing;

  applyTransform();
}

function applyTransform(): void {
  if (!avatarElement) return;
  
  // Apply transform - base transform centers the avatar, then we add offset and rotation
  const transform = `translate(calc(-50% + ${avatarState.offset.x}px), calc(-50% + ${avatarState.offset.y}px)) rotate(${avatarState.rotation}deg)`;
  avatarElement.style.transform = transform;
}

function createAvatarElement(): HTMLDivElement {
  const avatar = createElement(
    "div",
    { id: AVATAR_ID, class: "at-avatar" },
    {}
  );

  // Add SVG icon as the avatar visual
  // Size is set via CSS variable, we use a base size here that scales with the container
  avatar.innerHTML = getIconSvg("avatar", 32);

  return avatar;
}

