// Viewport feature implementation

import { createElement, generateId, injectStyles } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { ViewportFeatureConfig, ViewportElements } from "./types";

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

  config = { enabled: true, debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  // Inject viewport styles
  const styleCleanup = injectStyles(getViewportStyles(config.size), VIEWPORT_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create viewport elements
  elements = createViewportElements();
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

function getViewportStyles(size: number): string {
  return `
    .at-viewport-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${size}px;
      height: ${size}px;
      z-index: 999999;
      pointer-events: none;
    }

    .at-viewport-mask {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
      border: 3px solid #333;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
      background: transparent;
    }
  `;
}

