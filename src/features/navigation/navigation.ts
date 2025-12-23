// Navigation indicator feature implementation
// Shows a dot indicator pointing to the nearest direction artifact
// Also handles click-to-move functionality within the viewport

import { createElement, injectStyles } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { Artifact } from "../interaction/types";
import type { NavigationFeatureConfig } from "./types";
import { moveToPosition, isInputPaused } from "../input";
import { isStoryModeActive, handleStoryModeClick } from "../storymode";
import navigationStyles from "./navigation.css?inline";

let isInitialized = false;
let config: NavigationFeatureConfig;
let indicatorElement: HTMLDivElement | null = null;
let clickIndicatorElement: HTMLDivElement | null = null;
let cleanupFunctions: CleanupFunction[] = [];
let animationFrameId: number | null = null;
let getArtifactsFunc: (() => Artifact[]) | null = null;

// Movement state tracking
let isMoving = false;

const NAVIGATION_STYLES_ID = "adventure-time-navigation-styles";
const INDICATOR_ID = "adventure-time-nav-indicator";
const CLICK_INDICATOR_ID = "adventure-time-click-indicator";

// Distance threshold for "near" state (triggers pulse animation)
const NEAR_THRESHOLD = 100;

export function initNavigation(
  featureConfig: NavigationFeatureConfig,
  getArtifacts: () => Artifact[]
): void {
  if (isInitialized) {
    console.warn("Navigation already initialized");
    return;
  }

  config = { debug: false, ...featureConfig };
  getArtifactsFunc = getArtifacts;

  if (!config.enabled) {
    return;
  }

  // Inject navigation styles from CSS module
  const styleCleanup = injectStyles(navigationStyles, NAVIGATION_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create indicator element
  indicatorElement = createIndicatorElement();

  // Set CSS variables for customization
  if (config.indicatorSize) {
    indicatorElement.style.setProperty(
      "--at-nav-indicator-size",
      `${config.indicatorSize}px`
    );
  }
  if (config.indicatorColor) {
    indicatorElement.style.setProperty(
      "--at-nav-indicator-color",
      config.indicatorColor
    );
  }

  document.body.appendChild(indicatorElement);

  cleanupFunctions.push(() => {
    indicatorElement?.remove();
  });

  // Create click indicator element
  clickIndicatorElement = createElement(
    "div",
    { id: CLICK_INDICATOR_ID, class: "at-click-indicator" },
    {}
  );
  document.body.appendChild(clickIndicatorElement);
  cleanupFunctions.push(() => {
    clickIndicatorElement?.remove();
    clickIndicatorElement = null;
  });

  // Setup click-to-move handler
  setupClickToMove();

  // Start update loop
  startUpdateLoop();

  isInitialized = true;

  if (config.debug) {
    console.log("Navigation initialized", config);
  }
}

export function destroyNavigation(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  indicatorElement = null;
  clickIndicatorElement = null;
  getArtifactsFunc = null;
  isMoving = false;
  isInitialized = false;
}

export function getIndicatorElement(): HTMLDivElement | null {
  return indicatorElement;
}

/**
 * Called by input system when movement starts
 */
export function setNavigationMoving(moving: boolean): void {
  isMoving = moving;
}

function createIndicatorElement(): HTMLDivElement {
  const indicator = createElement(
    "div",
    { id: INDICATOR_ID, class: "at-navigation-indicator" },
    {}
  );

  return indicator;
}

function startUpdateLoop(): void {
  const update = () => {
    updateIndicatorPosition();
    animationFrameId = requestAnimationFrame(update);
  };

  animationFrameId = requestAnimationFrame(update);
}

/**
 * Checks if an artifact is visible within the game viewport
 */
function isArtifactInViewport(artifact: Artifact): boolean {
  const viewport = document.getElementById("adventure-time-viewport");
  if (!viewport) return false;

  const viewportRect = viewport.getBoundingClientRect();
  const artifactRect = artifact.iconElement.getBoundingClientRect();

  return (
    artifactRect.left < viewportRect.right &&
    artifactRect.right > viewportRect.left &&
    artifactRect.top < viewportRect.bottom &&
    artifactRect.bottom > viewportRect.top
  );
}

function updateIndicatorPosition(): void {
  if (!indicatorElement || !getArtifactsFunc) return;

  // Determine visibility based on movement state and config
  // Default: show when moving, hide when still
  // If showWhenStill is true: show when still, hide when moving
  const showWhenStill = config.showWhenStill ?? false;
  const shouldShowBasedOnMovement = showWhenStill ? !isMoving : isMoving;

  if (!shouldShowBasedOnMovement) {
    indicatorElement.classList.add("at-navigation-indicator--hidden");
    return;
  }

  // Get all direction artifacts
  const artifacts = getArtifactsFunc();
  const directionArtifacts = artifacts.filter((a) => a.type === "direction");

  if (directionArtifacts.length === 0) {
    // No direction artifacts - hide indicator
    indicatorElement.classList.add("at-navigation-indicator--hidden");
    return;
  }

  // Check if any direction artifact is already visible in the viewport
  const anyDirectionInViewport = directionArtifacts.some(isArtifactInViewport);
  if (anyDirectionInViewport) {
    // A direction artifact is already visible - no need for navigation hint
    indicatorElement.classList.add("at-navigation-indicator--hidden");
    return;
  }

  // Screen center (avatar position)
  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;

  // Find the nearest direction artifact
  let nearestArtifact: Artifact | null = null;
  let nearestDistance = Infinity;

  for (const artifact of directionArtifacts) {
    const rect = artifact.iconElement.getBoundingClientRect();
    const artifactCenterX = rect.left + rect.width / 2;
    const artifactCenterY = rect.top + rect.height / 2;

    const dx = artifactCenterX - screenCenterX;
    const dy = artifactCenterY - screenCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestArtifact = artifact;
    }
  }

  if (!nearestArtifact) {
    indicatorElement.classList.add("at-navigation-indicator--hidden");
    return;
  }

  // Show indicator
  indicatorElement.classList.remove("at-navigation-indicator--hidden");

  // Calculate direction to nearest artifact
  const rect = nearestArtifact.iconElement.getBoundingClientRect();
  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height / 2;

  const dx = targetX - screenCenterX;
  const dy = targetY - screenCenterY;

  // Normalize direction
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  const normalizedX = dx / magnitude;
  const normalizedY = dy / magnitude;

  // Position indicator at configured distance from center
  const indicatorX = screenCenterX + normalizedX * config.indicatorDistance;
  const indicatorY = screenCenterY + normalizedY * config.indicatorDistance;

  // Apply position
  indicatorElement.style.left = `${indicatorX}px`;
  indicatorElement.style.top = `${indicatorY}px`;

  // Add "near" class if close to target
  if (nearestDistance < NEAR_THRESHOLD) {
    indicatorElement.classList.add("at-navigation-indicator--near");
  } else {
    indicatorElement.classList.remove("at-navigation-indicator--near");
  }
}

// ============================================
// Click-to-Move Functionality
// ============================================

/**
 * Sets up click-to-move functionality within the viewport.
 * Uses document-level click handler to ensure clicks are captured.
 */
function setupClickToMove(): void {
  const handleClick = (e: MouseEvent) => {
    // Only handle left clicks
    if (e.button !== 0) return;
    
    // Get viewport element for bounds checking
    const viewport = document.getElementById("adventure-time-viewport");
    if (!viewport) return;
    
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Check if click is within the viewport bounds
    const viewportRect = viewport.getBoundingClientRect();
    const isInViewport = (
      clickX >= viewportRect.left &&
      clickX <= viewportRect.right &&
      clickY >= viewportRect.top &&
      clickY <= viewportRect.bottom
    );
    
    if (!isInViewport) return;
    
    // Check if click is on a story mode option - let those pass through
    const target = e.target as HTMLElement;
    const isStoryOption = target.closest(".at-story-option") !== null;
    
    // If story mode is active, handle the click there first
    if (isStoryModeActive()) {
      // If clicking on a story option, let the story mode handle it directly
      if (isStoryOption) {
        return; // Don't interfere with option clicks
      }
      
      const handled = handleStoryModeClick();
      if (handled) {
        // Story mode handled the click (dismissed single-choice or blocked multi-choice)
        // Show indicator and start movement for single-choice dismissal
        showClickIndicator(clickX, clickY);
        // Movement will start after story mode resumes input
        // Set a small delay to let story mode cleanup complete
        setTimeout(() => {
          if (!isInputPaused()) {
            moveToPosition(clickX, clickY, () => {
              hideClickIndicator();
            });
          }
        }, 50);
        return;
      }
    }
    
    // Don't handle clicks on artifacts (those trigger collision/story mode)
    if (target.classList.contains("at-artifact")) {
      // Still show indicator and move towards artifact
      showClickIndicator(clickX, clickY);
      moveToPosition(clickX, clickY, () => {
        hideClickIndicator();
      });
      return;
    }
    
    // Normal click-to-move
    showClickIndicator(clickX, clickY);
    moveToPosition(clickX, clickY, () => {
      hideClickIndicator();
    });
  };

  // Use document-level handler to catch all clicks
  document.addEventListener("click", handleClick);
  
  cleanupFunctions.push(() => {
    document.removeEventListener("click", handleClick);
  });
}

/**
 * Shows the click indicator at the specified screen position
 */
function showClickIndicator(x: number, y: number): void {
  if (!clickIndicatorElement) return;
  
  clickIndicatorElement.style.left = `${x}px`;
  clickIndicatorElement.style.top = `${y}px`;
  clickIndicatorElement.classList.remove("at-click-indicator--active");
  
  // Force reflow to restart animation
  void clickIndicatorElement.offsetWidth;
  
  clickIndicatorElement.classList.add("at-click-indicator--active");
}

/**
 * Hides the click indicator
 */
function hideClickIndicator(): void {
  if (!clickIndicatorElement) return;
  clickIndicatorElement.classList.remove("at-click-indicator--active");
}
