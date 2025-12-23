// Interaction layer feature implementation

import { createElement, injectStyles, generateId } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { InteractionFeatureConfig, Artifact, ArtifactType } from "./types";
import { ARTIFACT_PRIORITY, ARTIFACT_ICONS, ARTIFACT_SELECTORS } from "./types";

let isInitialized = false;
let config: InteractionFeatureConfig;
let interactionLayer: HTMLDivElement | null = null;
let artifacts: Artifact[] = [];
let processedElements: Set<HTMLElement> = new Set();
let cleanupFunctions: CleanupFunction[] = [];

const INTERACTION_LAYER_ID = "adventure-time-interaction-layer";
const INTERACTION_STYLES_ID = "adventure-time-interaction-styles";

export function initInteraction(
  featureConfig: InteractionFeatureConfig,
  worldContainer: HTMLElement
): void {
  if (isInitialized) {
    console.warn("Interaction layer already initialized");
    return;
  }

  config = { debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  // Inject interaction layer styles
  const styleCleanup = injectStyles(
    getInteractionStyles(config.backgroundColor),
    INTERACTION_STYLES_ID
  );
  cleanupFunctions.push(styleCleanup);

  // Create the interaction layer
  interactionLayer = createInteractionLayer();

  // Add interaction layer to world container (between layer 1 and 2)
  worldContainer.appendChild(interactionLayer);

  cleanupFunctions.push(() => {
    interactionLayer?.remove();
  });

  // Scan the world container for artifacts
  scanForArtifacts(worldContainer);

  isInitialized = true;

  if (config.debug) {
    console.log("Interaction layer initialized", {
      config,
      artifactCount: artifacts.length,
    });
  }
}

export function destroyInteraction(): void {
  // Remove all artifact icons
  artifacts.forEach((artifact) => {
    artifact.iconElement.remove();
  });

  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  interactionLayer = null;
  artifacts = [];
  processedElements = new Set();
  isInitialized = false;
}

export function getInteractionLayer(): HTMLDivElement | null {
  return interactionLayer;
}

export function getArtifacts(): Artifact[] {
  return [...artifacts];
}

/**
 * Removes an artifact by ID (used when collecting)
 */
export function removeArtifact(artifactId: string): void {
  const index = artifacts.findIndex((a) => a.id === artifactId);
  if (index !== -1) {
    const artifact = artifacts[index];
    artifact.iconElement.remove();
    artifacts.splice(index, 1);

    if (config.debug) {
      console.log("Artifact removed:", artifactId);
    }
  }
}

/**
 * Updates artifact interactivity based on whether they're within the viewport.
 * Should be called on each frame or when the world moves.
 */
export function updateArtifactViewportStates(): void {
  const viewport = document.getElementById("adventure-time-viewport");
  if (!viewport) return;

  const viewportRect = viewport.getBoundingClientRect();

  artifacts.forEach((artifact) => {
    const rect = artifact.iconElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const isInViewport =
      centerX >= viewportRect.left &&
      centerX <= viewportRect.right &&
      centerY >= viewportRect.top &&
      centerY <= viewportRect.bottom;

    if (isInViewport) {
      artifact.iconElement.classList.remove("at-artifact--outside-viewport");
    } else {
      artifact.iconElement.classList.add("at-artifact--outside-viewport");
    }
  });
}

/**
 * Rescans the world for artifacts (useful after DOM changes)
 */
export function rescanArtifacts(worldContainer: HTMLElement): void {
  if (!interactionLayer) return;

  // Clear existing artifacts
  artifacts.forEach((artifact) => {
    artifact.iconElement.remove();
  });
  artifacts = [];
  processedElements = new Set();

  // Rescan
  scanForArtifacts(worldContainer);

  if (config.debug) {
    console.log("Artifacts rescanned", { artifactCount: artifacts.length });
  }
}

function createInteractionLayer(): HTMLDivElement {
  const layer = createElement(
    "div",
    { id: INTERACTION_LAYER_ID, class: "at-interaction-layer" },
    {}
  );

  return layer;
}

/**
 * Scans the world container for DOM elements and creates artifacts
 */
function scanForArtifacts(worldContainer: HTMLElement): void {
  if (!interactionLayer) return;

  // Get artifact types sorted by priority (highest first)
  const sortedTypes = (Object.keys(ARTIFACT_PRIORITY) as ArtifactType[]).sort(
    (a, b) => ARTIFACT_PRIORITY[b] - ARTIFACT_PRIORITY[a]
  );

  // Process each artifact type in priority order
  for (const artifactType of sortedTypes) {
    const selector = ARTIFACT_SELECTORS[artifactType];
    const elements = worldContainer.querySelectorAll<HTMLElement>(selector);

    elements.forEach((element) => {
      // Skip if this element or any ancestor has already been processed
      if (isElementOrAncestorProcessed(element)) {
        return;
      }

      // Skip hidden elements
      if (!isElementVisible(element)) {
        return;
      }

      // Create artifact for this element
      const artifact = createArtifact(element, artifactType);
      if (artifact) {
        artifacts.push(artifact);
        interactionLayer!.appendChild(artifact.iconElement);

        // Mark this element and all descendants as processed
        markElementAndDescendants(element);
      }
    });
  }
}

/**
 * Checks if an element or any of its ancestors has been processed
 */
function isElementOrAncestorProcessed(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (processedElements.has(current)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

/**
 * Marks an element and all its descendants as processed
 */
function markElementAndDescendants(element: HTMLElement): void {
  processedElements.add(element);

  // Mark all descendants
  const descendants = element.querySelectorAll<HTMLElement>("*");
  descendants.forEach((descendant) => {
    processedElements.add(descendant);
  });
}

/**
 * Checks if an element is visible
 */
function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

/**
 * Creates an artifact for a DOM element
 */
function createArtifact(
  element: HTMLElement,
  type: ArtifactType
): Artifact | null {
  const rect = element.getBoundingClientRect();

  // Get the element's position relative to the document
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Calculate random position within the element bounds
  // Add padding to keep icon away from edges (based on icon size ~30px)
  const padding = 20;
  const availableWidth = Math.max(rect.width - padding * 2, 0);
  const availableHeight = Math.max(rect.height - padding * 2, 0);

  // Random offset within available space
  const randomOffsetX = availableWidth > 0 ? Math.random() * availableWidth : 0;
  const randomOffsetY =
    availableHeight > 0 ? Math.random() * availableHeight : 0;

  // Calculate final position (element left + padding + random offset)
  const posX = rect.left + scrollLeft + padding + randomOffsetX;
  const posY = rect.top + scrollTop + padding + randomOffsetY;

  // Create the icon element
  const iconElement = createElement(
    "div",
    {
      class: `at-artifact at-artifact-${type}`,
      "data-artifact-type": type,
    },
    {}
  );

  iconElement.textContent = ARTIFACT_ICONS[type];

  // Position the icon at the random position within the element
  iconElement.style.left = `${posX}px`;
  iconElement.style.top = `${posY}px`;

  const artifact: Artifact = {
    id: generateId("artifact"),
    type,
    sourceElement: element,
    iconElement,
    position: { x: posX, y: posY },
    size: { width: rect.width, height: rect.height },
  };

  return artifact;
}

function getInteractionStyles(backgroundColor: string): string {
  return `
    .at-interaction-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      background: ${backgroundColor};
    }

    .at-artifact {
      position: absolute;
      transform: translate(-50%, -50%);
      font-size: 24px;
      pointer-events: auto;
      cursor: pointer;
      transition: transform 0.2s ease, filter 0.2s ease;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      z-index: 11;
    }

    .at-artifact:hover {
      transform: translate(-50%, -50%) scale(1.3);
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    }

    /* Artifacts outside viewport - disable interaction styling */
    .at-artifact--outside-viewport {
      cursor: default;
      pointer-events: none;
    }

    .at-artifact--outside-viewport:hover {
      transform: translate(-50%, -50%);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    /* Artifact type specific styles */
    .at-artifact-portal {
      font-size: 28px;
      animation: at-portal-pulse 2s ease-in-out infinite;
    }

    .at-artifact-gold {
      font-size: 32px;
      animation: at-gold-shine 3s ease-in-out infinite;
    }

    .at-artifact-silver {
      font-size: 26px;
    }

    .at-artifact-diamond {
      font-size: 30px;
      animation: at-diamond-sparkle 2.5s ease-in-out infinite;
    }

    .at-artifact-paper {
      font-size: 22px;
    }

    .at-artifact-direction {
      font-size: 26px;
    }

    @keyframes at-portal-pulse {
      0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
      50% { transform: translate(-50%, -50%) rotate(180deg); }
    }

    @keyframes at-gold-shine {
      0%, 100% { filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) brightness(1); }
      50% { filter: drop-shadow(0 2px 8px rgba(255, 215, 0, 0.6)) brightness(1.2); }
    }

    @keyframes at-diamond-sparkle {
      0%, 100% { filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); }
      50% { filter: drop-shadow(0 2px 12px rgba(100, 200, 255, 0.8)); }
    }
  `;
}
