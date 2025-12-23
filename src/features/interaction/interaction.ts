// Interaction layer feature implementation

import { createElement, injectStyles, generateId } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type {
  InteractionFeatureConfig,
  Artifact,
  ArtifactType,
  GhostMarker,
} from "./types";
import {
  ARTIFACT_PRIORITY,
  ARTIFACT_ICONS,
  ARTIFACT_SELECTORS,
  BLOCK_LEVEL_TAGS,
} from "./types";
import interactionStyles from "./interaction.css?inline";

let isInitialized = false;
let config: InteractionFeatureConfig;
let interactionLayer: HTMLDivElement | null = null;
let artifacts: Artifact[] = [];
let ghostMarkers: GhostMarker[] = [];
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

  // Inject interaction layer styles from CSS module
  const styleCleanup = injectStyles(interactionStyles, INTERACTION_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create the interaction layer
  interactionLayer = createInteractionLayer();

  // Only override CSS default if explicitly configured
  if (config.backgroundColor) {
    interactionLayer.style.setProperty(
      "--at-interaction-bg",
      config.backgroundColor
    );
  }

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

  // Remove all ghost markers
  ghostMarkers.forEach((marker) => {
    marker.iconElement.remove();
  });

  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  interactionLayer = null;
  artifacts = [];
  ghostMarkers = [];
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
 * Returns the artifact's position for ghost marker placement
 */
export function removeArtifact(
  artifactId: string
): { x: number; y: number } | null {
  const index = artifacts.findIndex((a) => a.id === artifactId);
  if (index !== -1) {
    const artifact = artifacts[index];
    const position = { ...artifact.position };
    artifact.iconElement.remove();
    artifacts.splice(index, 1);

    if (config.debug) {
      console.log("Artifact removed:", artifactId);
    }

    return position;
  }
  return null;
}

/**
 * Creates a ghost marker (faint star) at the specified position
 * Used to mark where artifacts were collected
 * Returns the ghost marker ID for cooldown tracking
 */
export function createGhostMarker(
  position: { x: number; y: number },
  originalType: ArtifactType,
  originalContent: string,
  originalHref?: string
): string | null {
  if (!interactionLayer) return null;

  const id = generateId("ghost");
  const ghost = document.createElement("div") as HTMLDivElement;
  ghost.className = "at-ghost-marker";
  ghost.setAttribute("data-ghost-id", id);
  ghost.textContent = "⭐";
  ghost.style.left = `${position.x}px`;
  ghost.style.top = `${position.y}px`;

  const marker: GhostMarker = {
    id,
    originalType,
    originalContent,
    originalHref,
    iconElement: ghost,
    position,
  };

  ghostMarkers.push(marker);
  interactionLayer.appendChild(ghost);

  if (config.debug) {
    console.log("Ghost marker created:", marker);
  }

  return id;
}

/**
 * Returns all ghost markers
 */
export function getGhostMarkers(): GhostMarker[] {
  return [...ghostMarkers];
}

/**
 * Returns the intro configuration if enabled
 */
export function getIntroConfig() {
  return config.intro;
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

  // Track if we've found the first direction artifact (for intro)
  let firstDirectionFound = false;

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

      // For paper artifacts, apply special filtering
      if (artifactType === "paper") {
        // Skip elements without meaningful text content
        if (!hasTextContent(element)) {
          return;
        }
        // For divs and spans, only include if they're "simple text" containers
        const tagName = element.tagName.toLowerCase();
        if (
          (tagName === "div" || tagName === "span") &&
          !isSimpleTextElement(element)
        ) {
          return;
        }
      }

      // Create artifact for this element
      const artifact = createArtifact(element, artifactType);
      if (artifact) {
        // Mark first direction artifact as intro if intro is enabled
        if (
          artifactType === "direction" &&
          !firstDirectionFound &&
          config.intro?.enabled
        ) {
          artifact.isIntro = true;
          firstDirectionFound = true;

          // Update icon to intro icon
          const introIcon = config.intro.icon || "🎪";
          artifact.iconElement.textContent = introIcon;
          artifact.iconElement.classList.add("at-artifact-intro");
        }

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
 * Checks if an element has meaningful text content (not just whitespace)
 */
function hasTextContent(element: HTMLElement): boolean {
  // Get direct text content (not from child elements that might be other artifacts)
  const text = element.textContent?.trim() || "";
  // Require at least some characters of text
  return text.length > 0;
}

/**
 * Checks if a div/span is a "simple text element" - meaning it primarily contains
 * text rather than being a layout container.
 *
 * A simple text element:
 * - Has direct text nodes (not just text in nested elements)
 * - Has no block-level children (no nested divs, sections, etc.)
 * - Is not too large (prevents treating entire page sections as text)
 */
function isSimpleTextElement(element: HTMLElement): boolean {
  // Check for block-level children - if present, this is a container, not a text element
  const children = Array.from(element.children);
  for (const child of children) {
    const childTag = child.tagName.toLowerCase();
    if (BLOCK_LEVEL_TAGS.includes(childTag)) {
      return false;
    }
  }

  // Check if element has direct text nodes (not just text in children)
  const hasDirectText = Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
  );

  if (!hasDirectText) {
    // If no direct text, check if it only contains inline elements with text
    // (like <span>text</span> or <strong>text</strong>)
    const hasOnlyInlineChildren = children.every((child) => {
      const tag = child.tagName.toLowerCase();
      const inlineTags = [
        "span",
        "a",
        "strong",
        "em",
        "b",
        "i",
        "u",
        "small",
        "mark",
        "sub",
        "sup",
        "code",
        "kbd",
        "br",
      ];
      return inlineTags.includes(tag);
    });

    if (!hasOnlyInlineChildren) {
      return false;
    }
  }

  // Size check - don't treat very large elements as simple text
  const rect = element.getBoundingClientRect();
  const maxSize = 500; // Max width/height for a "simple" text element
  if (rect.width > maxSize && rect.height > maxSize) {
    return false;
  }

  return true;
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
  let artifactClass = `at-artifact at-artifact-${type}`;

  // For direction artifacts, add header level class for size scaling
  if (type === "direction") {
    const tagName = element.tagName.toLowerCase();
    const headerLevel = tagName.match(/^h([1-6])$/)?.[1] || "4";
    artifactClass += ` at-artifact-direction-h${headerLevel}`;
  }

  const iconElement = createElement(
    "div",
    {
      class: artifactClass,
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
