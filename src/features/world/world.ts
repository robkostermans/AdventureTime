// World feature implementation

import { createElement, injectStyles, clamp } from "../../core/utils";
import type { CleanupFunction, Vector2D } from "../../core/types";
import type { WorldFeatureConfig, WorldBounds, WorldState } from "./types";
import { updateArtifactViewportStates } from "../interaction";

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

  config = { enabled: true, debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  // Calculate world bounds based on viewport and page size
  const bounds = calculateWorldBounds(config.viewportSize);

  // Initialize world state at center
  worldState = {
    position: { x: 0, y: 0 },
    bounds,
  };

  // Inject world styles
  const styleCleanup = injectStyles(
    getWorldStyles(config.backgroundColor),
    WORLD_STYLES_ID
  );
  cleanupFunctions.push(styleCleanup);

  // Create world container that wraps the page content
  worldContainer = createWorldContainer();

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

  const clampedX = clamp(position.x, worldState.bounds.minX, worldState.bounds.maxX);
  const clampedY = clamp(position.y, worldState.bounds.minY, worldState.bounds.maxY);

  worldState.position.x = clampedX;
  worldState.position.y = clampedY;

  worldContainer.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
}

function calculateWorldBounds(viewportSize: number): WorldBounds {
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

  // Calculate extended border (space from viewport edge to screen edge)
  const extendedBorderX = (screenWidth - viewportSize) / 2;
  const extendedBorderY = (screenHeight - viewportSize) / 2;

  // World can move such that avatar (center) can reach all corners
  // When world position is 0,0 the avatar is at the top-left of the page
  // Max movement allows avatar to reach bottom-right
  return {
    minX: -(pageWidth - viewportSize / 2 - extendedBorderX),
    maxX: extendedBorderX + viewportSize / 2,
    minY: -(pageHeight - viewportSize / 2 - extendedBorderY),
    maxY: extendedBorderY + viewportSize / 2,
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
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";

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

function getWorldStyles(backgroundColor: string): string {
  return `
    .at-world-container {
      position: absolute;
      top: 0;
      left: 0;
      min-width: 100vw;
      min-height: 100vh;
      transition: transform 0.05s linear;
      transform-origin: top left;
      background: ${backgroundColor};
    }
  `;
}

