// World feature implementation

import { createElement, injectStyles, clamp } from "../../core/utils";
import type { CleanupFunction, Vector2D } from "../../core/types";
import type { WorldFeatureConfig, WorldBounds, WorldState } from "./types";
import { updateArtifactViewportStates } from "../interaction";
import worldStyles from "./world.css?inline";

let isInitialized = false;
let config: WorldFeatureConfig;
let worldContainer: HTMLDivElement | null = null;
let worldState: WorldState | null = null;
let cleanupFunctions: CleanupFunction[] = [];

const WORLD_CONTAINER_ID = "adventure-time-world";
const WORLD_STYLES_ID = "adventure-time-world-styles";

export function initWorld(featureConfig: WorldFeatureConfig): void {
  if (isInitialized) {
    console.warn("World already initialized");
    return;
  }

  config = { debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  // Calculate world bounds based on viewport and page size
  const bounds = calculateWorldBounds();

  // Calculate initial avatar map position (screen center when world is at 0,0)
  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;

  // Initialize world state at center
  worldState = {
    position: { x: 0, y: 0 },
    bounds,
    avatarMapPosition: { x: screenCenterX, y: screenCenterY },
  };

  // Inject world styles from CSS module
  const styleCleanup = injectStyles(worldStyles, WORLD_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create world container that wraps the page content
  worldContainer = createWorldContainer();

  // Only override CSS default if explicitly configured
  if (config.backgroundColor) {
    worldContainer.style.setProperty("--at-world-bg", config.backgroundColor);
  }

  // Move all body children into the world container
  wrapPageContent(worldContainer);

  isInitialized = true;

  if (config.debug) {
    console.log("World initialized", { config, bounds });
  }
}

export function destroyWorld(): void {
  // Unwrap page content before destroying
  if (worldContainer) {
    unwrapPageContent(worldContainer);
  }

  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  worldContainer = null;
  worldState = null;
  isInitialized = false;
}

export function getWorldContainer(): HTMLDivElement | null {
  return worldContainer;
}

export function getWorldState(): WorldState | null {
  return worldState ? { ...worldState } : null;
}

/**
 * Moves the world by a delta vector (inverted movement)
 * Returns the actual movement applied (may be clamped by bounds)
 */
export function moveWorld(delta: Vector2D): Vector2D {
  if (!worldState || !worldContainer) {
    return { x: 0, y: 0 };
  }

  const newX = worldState.position.x + delta.x;
  const newY = worldState.position.y + delta.y;

  // Clamp to world bounds
  const clampedX = clamp(newX, worldState.bounds.minX, worldState.bounds.maxX);
  const clampedY = clamp(newY, worldState.bounds.minY, worldState.bounds.maxY);

  // Calculate actual movement
  const actualDelta = {
    x: clampedX - worldState.position.x,
    y: clampedY - worldState.position.y,
  };

  // Update state
  worldState.position.x = clampedX;
  worldState.position.y = clampedY;

  // Update avatar map position (screen center - world position)
  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;
  worldState.avatarMapPosition.x = screenCenterX - clampedX;
  worldState.avatarMapPosition.y = screenCenterY - clampedY;

  // Apply transform to world container
  worldContainer.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

  // Update artifact interactivity based on viewport position
  updateArtifactViewportStates();

  return actualDelta;
}

/**
 * Sets the world position directly
 */
export function setWorldPosition(position: Vector2D): void {
  if (!worldState || !worldContainer) {
    return;
  }

  const clampedX = clamp(
    position.x,
    worldState.bounds.minX,
    worldState.bounds.maxX
  );
  const clampedY = clamp(
    position.y,
    worldState.bounds.minY,
    worldState.bounds.maxY
  );

  worldState.position.x = clampedX;
  worldState.position.y = clampedY;

  // Update avatar map position (screen center - world position)
  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;
  worldState.avatarMapPosition.x = screenCenterX - clampedX;
  worldState.avatarMapPosition.y = screenCenterY - clampedY;

  worldContainer.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
}

/**
 * Recalculates world bounds based on current viewport size.
 * Adjusts world position to keep the avatar at the same map location.
 * Should be called when the window is resized.
 */
export function recalculateWorldBounds(): void {
  if (!worldState || !worldContainer) return;
  
  // The avatar's map position is stored and maintained on every world move
  // This represents the avatar's position in page/map coordinates (doesn't change with resize)
  const avatarMapX = worldState.avatarMapPosition.x;
  const avatarMapY = worldState.avatarMapPosition.y;
  
  // Recalculate bounds with new viewport size
  worldState.bounds = calculateWorldBounds();
  
  // Calculate new world position to keep avatar at the same map location
  // world position = screen center - avatar map position
  const newScreenCenterX = window.innerWidth / 2;
  const newScreenCenterY = window.innerHeight / 2;
  
  let newX = newScreenCenterX - avatarMapX;
  let newY = newScreenCenterY - avatarMapY;
  
  // Clamp to new bounds
  newX = clamp(newX, worldState.bounds.minX, worldState.bounds.maxX);
  newY = clamp(newY, worldState.bounds.minY, worldState.bounds.maxY);
  
  // Update position
  worldState.position.x = newX;
  worldState.position.y = newY;
  worldContainer.style.transform = `translate(${newX}px, ${newY}px)`;
}

/**
 * Calculates world bounds based on current viewport size.
 * Viewport is responsive: full screen on mobile, constrained on larger screens.
 */
function calculateWorldBounds(): WorldBounds {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // Get the full scrollable page dimensions
  const pageWidth = Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
    screenWidth
  );
  const pageHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    screenHeight
  );

  // Get actual viewport dimensions (responsive)
  const viewportElement = document.getElementById("adventure-time-viewport");
  let viewportWidth = screenWidth;
  let viewportHeight = screenHeight;

  if (viewportElement) {
    const rect = viewportElement.getBoundingClientRect();
    viewportWidth = rect.width;
    viewportHeight = rect.height;
  }

  // Calculate extended border (space from viewport edge to screen edge)
  const extendedBorderX = (screenWidth - viewportWidth) / 2;
  const extendedBorderY = (screenHeight - viewportHeight) / 2;

  // World can move such that avatar (center) can reach all corners
  // When world position is 0,0 the avatar is at the top-left of the page
  // Max movement allows avatar to reach bottom-right
  return {
    minX: -(pageWidth - viewportWidth / 2 - extendedBorderX),
    maxX: extendedBorderX + viewportWidth / 2,
    minY: -(pageHeight - viewportHeight / 2 - extendedBorderY),
    maxY: extendedBorderY + viewportHeight / 2,
  };
}

function createWorldContainer(): HTMLDivElement {
  const container = createElement(
    "div",
    { id: WORLD_CONTAINER_ID, class: "at-world-container" },
    {}
  );

  return container;
}

function wrapPageContent(container: HTMLDivElement): void {
  // Store original body styles
  const originalOverflow = document.body.style.overflow;
  const originalPosition = document.body.style.position;

  // Prevent scrolling on the body
  document.body.classList.add("at-world-body");

  // Move all children to the world container
  const children = Array.from(document.body.children);
  children.forEach((child) => {
    // Don't move our own elements
    if (
      child.id === WORLD_CONTAINER_ID ||
      child.id === "adventure-time-viewport" ||
      child.id === "adventure-time-avatar" ||
      child.tagName === "STYLE" ||
      child.tagName === "SCRIPT"
    ) {
      return;
    }
    container.appendChild(child);
  });

  // Add the container to the body
  document.body.insertBefore(container, document.body.firstChild);

  // Cleanup function to restore original state
  cleanupFunctions.push(() => {
    document.body.style.overflow = originalOverflow;
    document.body.style.position = originalPosition;
    document.body.style.width = "";
    document.body.style.height = "";
  });
}

function unwrapPageContent(container: HTMLDivElement): void {
  // Move all children back to body
  const children = Array.from(container.children);
  children.forEach((child) => {
    document.body.appendChild(child);
  });

  // Remove the container
  container.remove();
}
