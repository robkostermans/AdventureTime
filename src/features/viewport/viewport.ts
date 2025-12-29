// Viewport feature implementation

import { createElement, injectStyles } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { ViewportFeatureConfig, ViewportElements } from "./types";
import viewportStyles from "./viewport.css?inline";

let isInitialized = false;
let config: ViewportFeatureConfig;
let elements: ViewportElements | null = null;
let cleanupFunctions: CleanupFunction[] = [];
let resizeHandler: (() => void) | null = null;
let onCloseCallback: (() => void) | null = null;

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

  // Apply viewport sizing
  updateViewportSize();

  // Listen for window resize to update sizing
  resizeHandler = () => updateViewportSize();
  window.addEventListener("resize", resizeHandler);

  document.body.appendChild(elements.container);

  cleanupFunctions.push(() => {
    elements?.container.remove();
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
  });

  isInitialized = true;

  if (config.debug) {
    console.log("Viewport initialized", config);
  }
}

/**
 * Updates viewport size based on current window dimensions and config.
 * On mobile (below breakpoint), uses full screen.
 * On larger screens, scales both dimensions by sizePercent, maintaining window aspect ratio.
 */
function updateViewportSize(): void {
  if (!elements || !config) return;

  const isMobile = window.innerWidth <= config.mobileBreakpoint;

  if (isMobile) {
    // Full screen on mobile
    elements.container.style.setProperty("--at-viewport-width", "100vw");
    elements.container.style.setProperty("--at-viewport-height", "100vh");
  } else {
    // Scale both dimensions by sizePercent, maintaining window aspect ratio
    elements.container.style.setProperty(
      "--at-viewport-width",
      `${config.sizePercent}vw`
    );
    elements.container.style.setProperty(
      "--at-viewport-height",
      `${config.sizePercent}vh`
    );
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
 * On mobile (below breakpoint), returns full screen size.
 * On larger screens, returns scaled dimensions maintaining window aspect ratio.
 */
export function getViewportDimensions(): { width: number; height: number } {
  if (!config) {
    return {
      width: window.innerWidth * 0.9,
      height: window.innerHeight * 0.9,
    };
  }

  const isMobile = window.innerWidth <= config.mobileBreakpoint;

  if (isMobile) {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  // Scale both dimensions by sizePercent
  const width = (window.innerWidth * config.sizePercent) / 100;
  const height = (window.innerHeight * config.sizePercent) / 100;

  return { width, height };
}

function createViewportElements(): ViewportElements {
  const container = createElement(
    "div",
    { id: VIEWPORT_ID, class: "at-viewport-container" },
    {}
  );

  const mask = createElement("div", { class: "at-viewport-mask" }, {});

  // Create close button
  const closeButton = createElement(
    "button",
    { class: "at-close-button", title: "Close AdventureTime" },
    {}
  );

  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (onCloseCallback) {
      onCloseCallback();
    }
  });

  // Create fade overlay for portal travel
  const fadeOverlay = createElement("div", { class: "at-fade-overlay" }, {});

  container.appendChild(mask);
  container.appendChild(closeButton);
  container.appendChild(fadeOverlay);

  return { container, mask, fadeOverlay };
}

/**
 * Set callback for when the close button is clicked
 */
export function setCloseCallback(callback: () => void): void {
  onCloseCallback = callback;
}

/**
 * Fade to black (for portal travel)
 * @returns Promise that resolves when fade is complete
 */
export function fadeToBlack(): Promise<void> {
  return new Promise((resolve) => {
    if (!elements?.fadeOverlay) {
      resolve();
      return;
    }

    const overlay = elements.fadeOverlay;
    overlay.classList.add("at-fade-overlay--active");

    // Wait for transition to complete
    setTimeout(resolve, 500);
  });
}

/**
 * Fade from black (after arriving at new page)
 * @returns Promise that resolves when fade is complete
 */
export function fadeFromBlack(): Promise<void> {
  return new Promise((resolve) => {
    if (!elements?.fadeOverlay) {
      resolve();
      return;
    }

    const overlay = elements.fadeOverlay;
    overlay.classList.remove("at-fade-overlay--active");

    // Wait for transition to complete
    setTimeout(resolve, 500);
  });
}

/**
 * Check if viewport is currently faded to black
 */
export function isFadedToBlack(): boolean {
  return (
    elements?.fadeOverlay?.classList.contains("at-fade-overlay--active") ??
    false
  );
}
