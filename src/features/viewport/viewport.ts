// Viewport feature implementation

import { createElement, generateId, injectStyles } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { ViewportFeatureConfig, ViewportElements } from "./types";
import viewportStyles from "./viewport.css?inline";

let isInitialized = false;
let config: ViewportFeatureConfig;
let elements: ViewportElements | null = null;
let cleanupFunctions: CleanupFunction[] = [];

const VIEWPORT_ID = "adventure-time-viewport";
const VIEWPORT_STYLES_ID = "adventure-time-viewport-styles";

export function initViewport(featureConfig: ViewportFeatureConfig): void {
  if (isInitialized) {
    console.warn("Viewport already initialized");
    return;
  }

  config = { debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  // Inject viewport styles from CSS module
  const styleCleanup = injectStyles(viewportStyles, VIEWPORT_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create viewport elements
  elements = createViewportElements();
  
  // Set CSS variables for viewport max dimensions
  elements.container.style.setProperty("--at-viewport-max-width", `${config.maxWidth}px`);
  elements.container.style.setProperty("--at-viewport-max-height", `${config.maxHeight}px`);
  
  document.body.appendChild(elements.container);

  cleanupFunctions.push(() => {
    elements?.container.remove();
  });

  isInitialized = true;

  if (config.debug) {
    console.log("Viewport initialized", config);
  }
}

export function destroyViewport(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  elements = null;
  isInitialized = false;
}

export function getViewportElement(): HTMLDivElement | null {
  return elements?.mask ?? null;
}

export function getViewportContainer(): HTMLDivElement | null {
  return elements?.container ?? null;
}

/**
 * Returns the current viewport dimensions.
 * On mobile (smaller than max dimensions), returns actual screen size.
 * On larger screens, returns the max dimensions from config.
 */
export function getViewportDimensions(): { width: number; height: number } {
  if (!config) {
    return { width: 390, height: 844 }; // Default iPhone 14 dimensions
  }
  
  // Calculate actual viewport size (respecting max constraints)
  const width = Math.min(window.innerWidth, config.maxWidth);
  const height = Math.min(window.innerHeight, config.maxHeight);
  
  return { width, height };
}

function createViewportElements(): ViewportElements {
  const container = createElement(
    "div",
    { id: VIEWPORT_ID, class: "at-viewport-container" },
    {}
  );

  const mask = createElement(
    "div",
    { class: "at-viewport-mask" },
    {}
  );

  container.appendChild(mask);

  return { container, mask };
}

