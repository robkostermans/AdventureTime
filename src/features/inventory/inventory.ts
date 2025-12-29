// Inventory feature implementation

import { createElement, injectStyles, generateId } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { Artifact } from "../interaction/types";
import type { GhostMarker } from "../interaction/types";
import { getIconHtml, getArtifactIconName } from "../../core/icons";
import {
  createGhostMarker,
  getGhostMarkers,
  removeGhostMarker,
  restoreArtifactFromGhost,
  getIntroConfig,
} from "../interaction";
import { pauseInput, resumeInput, moveToPosition } from "../input";
import { getViewportContainer } from "../viewport";
import {
  isStoryModeEnabled,
  isStoryModeActive,
  showStoryMode,
  hideStoryMode,
  setStoryModeCallbacks,
} from "../storymode";
import {
  travelToDestination,
  travelBack,
  isSameOrigin,
} from "../travel";
import {
  getStoredInventory,
  addInventoryItem as persistInventoryItem,
  removeInventoryItem as unpersistInventoryItem,
  getPreviousPageUrl,
  markAllArtifactsReturnedOnPage,
} from "../persistence";
import type {
  InventoryFeatureConfig,
  InventoryItem,
  InventoryState,
} from "./types";
import { ARTIFACT_TYPE_LABELS, ARTIFACT_ACTION_LABELS } from "./types";
import inventoryStyles from "./inventory.css?inline";

let isInitialized = false;
let config: InventoryFeatureConfig;
let cleanupFunctions: CleanupFunction[] = [];

// UI Elements
let bagElement: HTMLDivElement | null = null;
let dialogElement: HTMLDivElement | null = null;
let tooltipElement: HTMLDivElement | null = null;

// State
let state: InventoryState = {
  items: [],
  isOpen: false,
  expandedItemId: null,
  focusedItemId: null,
};

// Collision detection
let collisionCheckInterval: number | null = null;
let getArtifactsFunc: (() => Artifact[]) | null = null;
let removeArtifactFunc:
  | ((id: string) => { x: number; y: number } | null)
  | null = null;
let artifactClickHandler: ((e: Event) => void) | null = null;

// Collision cooldown to prevent re-triggering after dismissing popover
let lastDismissedArtifactId: string | null = null;
let lastDismissedGhostMarkerId: string | null = null;
let collisionCooldownUntil: number = 0;
const COLLISION_COOLDOWN_MS = 500; // 500ms cooldown after dismissing

// Flag to skip intro artifact collision (when arrived via portal)
let skipIntroArtifact: boolean = false;

const INVENTORY_STYLES_ID = "adventure-time-inventory-styles";
const BAG_ID = "adventure-time-inventory-bag";
const DIALOG_ID = "adventure-time-inventory-dialog";

export function initInventory(
  featureConfig: InventoryFeatureConfig,
  getArtifacts: () => Artifact[],
  removeArtifact: (id: string) => { x: number; y: number } | null
): void {
  if (isInitialized) {
    console.warn("Inventory already initialized");
    return;
  }

  config = { debug: false, ...featureConfig };
  getArtifactsFunc = getArtifacts;
  removeArtifactFunc = removeArtifact;

  if (!config.enabled) {
    return;
  }

  // Load persisted inventory items
  const storedItems = getStoredInventory();
  const loadedItems: InventoryItem[] = storedItems.map((stored) => ({
    id: stored.id,
    artifact: {
      id: stored.id,
      type: stored.type,
      sourceElement: document.createElement("div"), // Placeholder
      iconElement: document.createElement("div") as HTMLDivElement, // Placeholder
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 }, // Placeholder - not needed for inventory display
    },
    collectedAt: stored.collectedAt,
    originalContent: stored.content,
    originalHref: stored.href,
    collectedFromUrl: stored.collectedFromUrl,
  }));

  // Reset state with loaded items
  state = {
    items: loadedItems,
    isOpen: false,
    expandedItemId: null,
    focusedItemId: null,
  };

  // Inject styles from CSS module
  const styleCleanup = injectStyles(inventoryStyles, INVENTORY_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create UI elements
  bagElement = createBagElement();
  dialogElement = createDialogElement();
  tooltipElement = createTooltipElement();

  // Append to viewport container so they're positioned relative to the viewport
  const viewportContainer = getViewportContainer();
  const container = viewportContainer || document.body;
  
  container.appendChild(bagElement);
  container.appendChild(dialogElement);
  container.appendChild(tooltipElement);

  cleanupFunctions.push(() => {
    bagElement?.remove();
    dialogElement?.remove();
    tooltipElement?.remove();
  });

  // Setup keyboard shortcut (Ctrl+I)
  setupKeyboardShortcuts();

  // Setup artifact click handler
  setupArtifactClickHandler();

  // Setup story mode callbacks
  if (isStoryModeEnabled()) {
    setStoryModeCallbacks(
      handleStoryModeTake,
      handleStoryModeLeave,
      handleStoryModeReturn,
      handleTravelBack
    );
  }

  // Update bag counter with loaded items
  updateBagCounter();

  // Note: Collision detection is NOT started here.
  // Call enableCollisionDetection() after all features are initialized
  // to prevent false collisions during initialization/resizing.

  isInitialized = true;

  if (config.debug) {
    console.log("Inventory initialized", config, { loadedItems: state.items.length });
  }
}

export function destroyInventory(): void {
  if (collisionCheckInterval !== null) {
    cancelAnimationFrame(collisionCheckInterval);
    collisionCheckInterval = null;
  }

  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];

  bagElement = null;
  dialogElement = null;
  tooltipElement = null;
  getArtifactsFunc = null;
  removeArtifactFunc = null;
  currentStoryModeArtifact = null;
  currentStoryModeGhostMarker = null;
  lastDismissedArtifactId = null;
  lastDismissedGhostMarkerId = null;
  collisionCooldownUntil = 0;

  state = {
    items: [],
    isOpen: false,
    expandedItemId: null,
    focusedItemId: null,
  };

  isInitialized = false;
}

export function getInventoryItems(): InventoryItem[] {
  return [...state.items];
}

export function isInventoryOpen(): boolean {
  return state.isOpen;
}

export function toggleInventory(): void {
  if (state.isOpen) {
    closeInventory();
  } else {
    openInventory();
  }
}

export function openInventory(): void {
  if (!dialogElement) return;

  // Close story mode if active
  if (isStoryModeActive()) {
    hideStoryMode();
  }

  state.isOpen = true;
  state.expandedItemId = null;
  state.focusedItemId = null;
  renderInventoryDialog();
  dialogElement.classList.add("at-inventory-dialog--open");
}

export function closeInventory(): void {
  if (!dialogElement) return;

  state.isOpen = false;
  state.expandedItemId = null;
  state.focusedItemId = null;
  hideTooltip();
  dialogElement.classList.remove("at-inventory-dialog--open");
}

// ============================================
// Collision Detection
// ============================================

/**
 * Enables collision detection.
 * Should be called after all features are fully initialized to prevent
 * false collisions during initialization or resizing.
 */
export function enableCollisionDetection(): void {
  if (!isInitialized) {
    console.warn(
      "Cannot enable collision detection: inventory not initialized"
    );
    return;
  }

  // Don't start if already running
  if (collisionCheckInterval !== null) {
    return;
  }

  // Add a small delay to ensure all layouts are settled
  setTimeout(() => {
    startCollisionDetection();
    if (config.debug) {
      console.log("Collision detection enabled");
    }
  }, 100);
}

/**
 * Set whether to skip the intro artifact collision.
 * Used when arriving via portal - the arrival message is shown instead.
 */
export function setSkipIntroArtifact(skip: boolean): void {
  skipIntroArtifact = skip;
}

/**
 * Get whether to skip the intro artifact collision.
 */
export function shouldSkipIntroArtifact(): boolean {
  return skipIntroArtifact;
}

function startCollisionDetection(): void {
  const checkCollisions = () => {
    // Skip if story mode is active
    if (isStoryModeActive()) {
      collisionCheckInterval = requestAnimationFrame(checkCollisions);
      return;
    }

    // Check if we're still in cooldown period
    const now = Date.now();
    if (now < collisionCooldownUntil) {
      collisionCheckInterval = requestAnimationFrame(checkCollisions);
      return;
    } else {
      // Cooldown expired - clear the return all dismissed IDs
      if (returnAllDismissedIds.size > 0) {
        returnAllDismissedIds.clear();
      }
    }

    // Check for artifact collisions first
    if (getArtifactsFunc) {
      const artifacts = getArtifactsFunc();
      const collidingArtifact = findCollidingArtifact(artifacts);

      if (collidingArtifact) {
        // Skip if this is the same artifact we just dismissed and we're still near it
        if (collidingArtifact.id === lastDismissedArtifactId) {
          collisionCheckInterval = requestAnimationFrame(checkCollisions);
          return;
        }
        // Skip if this artifact was just restored via "return all"
        if (returnAllDismissedIds.has(collidingArtifact.id)) {
          collisionCheckInterval = requestAnimationFrame(checkCollisions);
          return;
        }
        // Skip intro artifact if we arrived via portal (arrival message is shown instead)
        if (collidingArtifact.isIntro && skipIntroArtifact) {
          collisionCheckInterval = requestAnimationFrame(checkCollisions);
          return;
        }
        // Always use story mode for artifact interactions
        showArtifactStoryMode(collidingArtifact);
        collisionCheckInterval = requestAnimationFrame(checkCollisions);
        return;
      } else {
        // No artifact collision - clear the last dismissed artifact ID and return all IDs
        lastDismissedArtifactId = null;
        if (returnAllDismissedIds.size > 0) {
          returnAllDismissedIds.clear();
        }
      }
    }

    // Check for ghost marker collisions
    const ghostMarkers = getGhostMarkers();
    const collidingGhost = findCollidingGhostMarker(ghostMarkers);

    if (collidingGhost) {
      // Skip if this is the same ghost we just dismissed
      if (collidingGhost.id === lastDismissedGhostMarkerId) {
        collisionCheckInterval = requestAnimationFrame(checkCollisions);
        return;
      }
      showGhostMarkerStoryMode(collidingGhost);
    } else {
      // No ghost collision - clear the last dismissed ghost ID
      lastDismissedGhostMarkerId = null;
    }

    collisionCheckInterval = requestAnimationFrame(checkCollisions);
  };

  collisionCheckInterval = requestAnimationFrame(checkCollisions);
}

function findCollidingArtifact(artifacts: Artifact[]): Artifact | null {
  // Avatar is always at screen center
  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;

  const collisionRadius = config.avatarSize / 2 + config.collisionRadius;

  for (const artifact of artifacts) {
    // Get artifact's screen position (accounting for world transform)
    const artifactRect = artifact.iconElement.getBoundingClientRect();
    const artifactCenterX = artifactRect.left + artifactRect.width / 2;
    const artifactCenterY = artifactRect.top + artifactRect.height / 2;

    // Calculate distance
    const dx = screenCenterX - artifactCenterX;
    const dy = screenCenterY - artifactCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check collision (artifact icon is ~24px, so ~12px radius)
    const artifactRadius = 15;
    if (distance < collisionRadius + artifactRadius) {
      return artifact;
    }
  }

  return null;
}

function findCollidingGhostMarker(
  ghostMarkers: GhostMarker[]
): GhostMarker | null {
  // Avatar is always at screen center
  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;

  const collisionRadius = config.avatarSize / 2 + config.collisionRadius;

  for (const ghost of ghostMarkers) {
    // Get ghost's screen position (accounting for world transform)
    const ghostRect = ghost.iconElement.getBoundingClientRect();
    const ghostCenterX = ghostRect.left + ghostRect.width / 2;
    const ghostCenterY = ghostRect.top + ghostRect.height / 2;

    // Calculate distance
    const dx = screenCenterX - ghostCenterX;
    const dy = screenCenterY - ghostCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check collision (ghost icon is smaller ~16px, so ~8px radius)
    const ghostRadius = 10;
    if (distance < collisionRadius + ghostRadius) {
      return ghost;
    }
  }

  return null;
}

// ============================================
// Story Mode Integration
// ============================================

/**
 * Current artifact being processed in story mode
 */
let currentStoryModeArtifact: Artifact | null = null;
let currentStoryModeContent: string | null = null;
let currentStoryModeHref: string | undefined = undefined;

/**
 * Shows story mode terminal for an artifact
 */
function showArtifactStoryMode(artifact: Artifact): void {
  currentStoryModeArtifact = artifact;

  // Check if this is an intro artifact
  const isIntro = artifact.isIntro === true;
  const introConfig = isIntro ? getIntroConfig() : null;

  // Extract original content
  const originalContent = getElementContent(artifact.sourceElement);
  currentStoryModeContent = originalContent;
  currentStoryModeHref =
    artifact.sourceElement.getAttribute("href") || undefined;

  // For intro, get header content and intro text
  let headerContent = originalContent;
  let introText: string | undefined;

  if (isIntro && introConfig?.text) {
    headerContent = getElementContent(artifact.sourceElement);
    introText = introConfig.text;
  }

  // Get previous page URL for travel back option at intro
  const previousPageUrl = isIntro ? getPreviousPageUrl() : undefined;

  showStoryMode(
    artifact,
    headerContent,
    isIntro,
    introText,
    currentStoryModeHref,
    false, // isGhostMarker
    previousPageUrl
  );
}

/**
 * Handle "Take" action from story mode
 */
function handleStoryModeTake(artifactId: string): void {
  if (!currentStoryModeArtifact || currentStoryModeArtifact.id !== artifactId) {
    return;
  }

  const artifact = currentStoryModeArtifact;
  const isPortal = artifact.type === "portal";

  if (isPortal && currentStoryModeHref) {
    // Portal: Travel to destination
    if (config.debug) {
      console.log("Travel action triggered for portal:", currentStoryModeHref);
    }

    // Check if it's a same-origin link (internal navigation)
    if (isSameOrigin(currentStoryModeHref)) {
      // Use travel system with fade transition
      travelToDestination({
        url: currentStoryModeHref,
        title: currentStoryModeContent || undefined,
      });
    } else {
      // External link - navigate directly
      window.location.href = currentStoryModeHref;
    }
    
    clearStoryModeState();
  } else {
    // Collect the artifact
    collectArtifact(
      artifact,
      currentStoryModeContent || "",
      currentStoryModeHref
    );
    clearStoryModeState();
  }
}

/**
 * Handle travel back from arrival story mode
 */
function handleTravelBack(): void {
  if (config.debug) {
    console.log("Travel back triggered");
  }
  travelBack();
}

/**
 * Handle "Leave" action from story mode
 */
function handleStoryModeLeave(artifactId: string): void {
  // Check if this is a ghost marker
  if (currentStoryModeGhostMarker && currentStoryModeGhostMarker.id === artifactId) {
    handleGhostMarkerLeave();
    return;
  }

  // Check if this is a regular artifact
  if (!currentStoryModeArtifact || currentStoryModeArtifact.id !== artifactId) {
    return;
  }

  // Track dismissed artifact for cooldown
  lastDismissedArtifactId = artifactId;
  collisionCooldownUntil = Date.now() + COLLISION_COOLDOWN_MS;

  clearStoryModeState();
}

/**
 * Clear story mode state
 */
function clearStoryModeState(): void {
  currentStoryModeArtifact = null;
  currentStoryModeContent = null;
  currentStoryModeHref = undefined;
}

/**
 * Current ghost marker being processed in story mode
 */
let currentStoryModeGhostMarker: GhostMarker | null = null;

/**
 * Shows story mode terminal for a ghost marker (collected artifact location)
 */
function showGhostMarkerStoryMode(ghost: GhostMarker): void {
  currentStoryModeGhostMarker = ghost;

  // Create a fake artifact for story mode display
  const fakeArtifact: Artifact = {
    id: ghost.id,
    type: ghost.originalType,
    sourceElement: document.createElement("div"), // Placeholder
    iconElement: ghost.iconElement,
    position: ghost.position,
    size: { width: 16, height: 16 },
  };

  // Show as ghost marker with return/leave options
  showStoryMode(
    fakeArtifact,
    ghost.originalContent,
    false, // Not intro
    undefined, // No intro text
    ghost.originalHref, // Original href if it was a portal
    true // isGhostMarker
  );
}

/**
 * Handle ghost marker leave (called when story mode closes for ghost)
 */
function handleGhostMarkerLeave(): void {
  if (currentStoryModeGhostMarker) {
    lastDismissedGhostMarkerId = currentStoryModeGhostMarker.id;
    collisionCooldownUntil = Date.now() + COLLISION_COOLDOWN_MS;
    currentStoryModeGhostMarker = null;
  }
}

/**
 * Handle "Return" action from story mode (return item to ghost marker location)
 */
function handleStoryModeReturn(artifactId: string): void {
  // This is called for ghost markers when user chooses to return the item
  if (
    !currentStoryModeGhostMarker ||
    currentStoryModeGhostMarker.id !== artifactId
  ) {
    // Check if this is a regular artifact (shouldn't happen, but handle gracefully)
    if (
      currentStoryModeArtifact &&
      currentStoryModeArtifact.id === artifactId
    ) {
      handleStoryModeLeave(artifactId);
    }
    return;
  }

  const ghost = currentStoryModeGhostMarker;

  // Find and remove the item from inventory
  const itemIndex = state.items.findIndex(
    (item) =>
      item.artifact.type === ghost.originalType &&
      item.originalContent === ghost.originalContent
  );

  if (itemIndex !== -1) {
    const removedItem = state.items[itemIndex];
    
    // Remove from inventory
    state.items.splice(itemIndex, 1);
    
    // Remove from persistence
    unpersistInventoryItem(removedItem.id);
    
    updateBagCounter();
    renderInventoryDialog();

    // Restore the artifact from the ghost marker (removes ghost and creates new artifact)
    const restoredArtifact = restoreArtifactFromGhost(ghost.id);

    if (restoredArtifact) {
      // Set cooldown using the NEW artifact's ID to prevent immediate re-collision
      lastDismissedArtifactId = restoredArtifact.id;
      collisionCooldownUntil = Date.now() + COLLISION_COOLDOWN_MS;

      if (config.debug) {
        console.log("Item returned to world:", restoredArtifact);
      }
    }
  }

  currentStoryModeGhostMarker = null;
}

// Track dismissed artifacts during "return all" to prevent immediate re-collision
let returnAllDismissedIds: Set<string> = new Set();

/**
 * Return all items from inventory.
 * Items from the current page will have their ghost markers restored to artifacts.
 * Items from other realms will be removed from inventory and marked as returned
 * in their original pages (so they appear as artifacts when visiting those pages).
 */
function returnAllItems(): void {
  if (state.items.length === 0) return;

  // Get all ghost markers on this page
  const allGhostMarkers = getGhostMarkers();

  if (config.debug) {
    console.log("Returning all items. Total items:", state.items.length, "Ghost markers on page:", allGhostMarkers.length);
  }

  // Collect unique page URLs that need artifacts marked as returned
  const pagesToUpdate = new Set<string>();
  
  // Track restored artifact IDs to prevent immediate re-collision
  const restoredArtifactIds: string[] = [];

  // First, restore ghost markers on this page
  for (const ghost of allGhostMarkers) {
    // Find the matching item in inventory by type and content
    const itemIndex = state.items.findIndex(
      (item) =>
        item.artifact.type === ghost.originalType &&
        item.originalContent === ghost.originalContent
    );

    if (itemIndex !== -1) {
      const removedItem = state.items[itemIndex];

      // Remove from inventory
      state.items.splice(itemIndex, 1);

      // Remove from persistence
      unpersistInventoryItem(removedItem.id);

      // Restore the artifact from the ghost marker
      const restoredArtifact = restoreArtifactFromGhost(ghost.id);
      if (restoredArtifact) {
        restoredArtifactIds.push(restoredArtifact.id);
      }
    }
  }

  // Now handle remaining items (from other realms)
  // These don't have ghost markers on this page
  const remainingItems = [...state.items];
  for (const item of remainingItems) {
    // Track which pages need their artifacts marked as returned
    if (item.collectedFromUrl) {
      pagesToUpdate.add(item.collectedFromUrl);
    }

    // Remove from inventory persistence
    unpersistInventoryItem(item.id);
  }

  // Mark all artifacts as returned on their original pages
  // This ensures they appear as artifacts (not ghost markers) when visiting those pages
  for (const pageUrl of pagesToUpdate) {
    markAllArtifactsReturnedOnPage(pageUrl);
  }

  // Clear all items from state
  state.items = [];

  // Update UI
  updateBagCounter();
  renderInventoryDialog();
  hideTooltip();

  // Set extended cooldown to prevent immediate collision with any restored artifact
  // Use a longer cooldown since multiple artifacts may have been restored
  collisionCooldownUntil = Date.now() + COLLISION_COOLDOWN_MS * 2;
  
  // Track all restored artifact IDs so collision detection skips them during cooldown
  returnAllDismissedIds = new Set(restoredArtifactIds);

  if (config.debug) {
    console.log("All items returned. Inventory cleared. Pages updated:", Array.from(pagesToUpdate));
  }
}

/**
 * Gets the displayable content from an element.
 * For void elements like <img>, returns outerHTML.
 * For complex styled elements (cards, tags, links/portals), returns outerHTML to preserve styling.
 * For other elements, returns innerHTML.
 */
function getElementContent(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();

  // Void elements that have no innerHTML - use outerHTML instead
  const voidElements = [
    "img",
    "br",
    "hr",
    "input",
    "embed",
    "area",
    "base",
    "col",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
  ];

  if (voidElements.includes(tagName)) {
    // For images, create a constrained version to fit in the preview
    if (tagName === "img") {
      const clone = element.cloneNode(true) as HTMLImageElement;
      clone.style.maxWidth = "100%";
      clone.style.maxHeight = "150px";
      clone.style.objectFit = "contain";
      clone.style.borderRadius = "8px";
      return clone.outerHTML;
    }
    return element.outerHTML;
  }

  // For elements with no innerHTML but meaningful content (like empty divs with background images)
  if (
    !element.innerHTML.trim() &&
    element.classList.contains("image-placeholder")
  ) {
    return element.outerHTML;
  }

  // For complex styled elements (cards, tags, links/portals), use outerHTML to preserve their styling
  // These elements have CSS classes or tag-specific styling that define their appearance
  if (
    element.classList.contains("card") ||
    element.classList.contains("tag") ||
    tagName === "a"
  ) {
    const clone = element.cloneNode(true) as HTMLElement;
    // Ensure the element displays properly in the preview container
    clone.style.margin = "0";
    clone.style.display = "inline-block";
    // For links, remove href to prevent navigation but keep visual styling
    if (tagName === "a") {
      (clone as HTMLAnchorElement).removeAttribute("href");
      // Styling is handled by CSS in .at-popover-preview a
    }
    return clone.outerHTML;
  }

  return element.innerHTML;
}

function collectArtifact(
  artifact: Artifact,
  originalContent: string,
  originalHref?: string
): void {
  const collectedAt = Date.now();
  const itemId = generateId("inv-item");
  const collectedFromUrl = window.location.pathname + window.location.search;
  
  // Create inventory item
  const item: InventoryItem = {
    id: itemId,
    artifact,
    collectedAt,
    originalContent,
    originalHref,
    collectedFromUrl,
  };

  // Add to inventory
  state.items.push(item);

  // Persist to localStorage
  persistInventoryItem({
    id: itemId,
    type: artifact.type,
    content: originalContent,
    href: originalHref,
    collectedAt,
    collectedFromUrl,
  });

  // Remove from interaction layer and get position for ghost marker
  let artifactPosition: { x: number; y: number } | null = null;
  if (removeArtifactFunc) {
    artifactPosition = removeArtifactFunc(artifact.id);
  }

  // Create ghost marker at the artifact's position with original content
  // and set it as dismissed to prevent immediate re-triggering
  if (artifactPosition) {
    const ghostId = createGhostMarker(
      artifactPosition,
      artifact.type,
      originalContent,
      artifact.sourceElement,
      originalHref
    );

    // Mark the newly created ghost as dismissed to prevent immediate collision
    if (ghostId) {
      lastDismissedGhostMarkerId = ghostId;
      collisionCooldownUntil = Date.now() + COLLISION_COOLDOWN_MS;
    }
  }

  // Update bag counter
  updateBagCounter();

  if (config.debug) {
    console.log("Artifact collected:", item);
  }
}

// ============================================
// Bag UI
// ============================================

function createBagElement(): HTMLDivElement {
  const bag = createElement(
    "div",
    { id: BAG_ID, class: "at-inventory-bag" },
    {}
  );

  bag.innerHTML = `
    <span class="at-bag-icon">${getIconHtml("inventory", 28)}</span>
    <span class="at-bag-counter">0</span>
  `;

  bag.addEventListener("click", () => toggleInventory());

  return bag;
}

function updateBagCounter(): void {
  if (!bagElement) return;

  const counter = bagElement.querySelector(".at-bag-counter");
  if (counter) {
    counter.textContent = String(state.items.length);

    // Show/hide counter based on item count
    if (state.items.length > 0) {
      counter.classList.add("at-bag-counter--visible");
    } else {
      counter.classList.remove("at-bag-counter--visible");
    }
  }
}

// ============================================
// Inventory Dialog
// ============================================

function createDialogElement(): HTMLDivElement {
  const dialog = createElement(
    "div",
    { id: DIALOG_ID, class: "at-inventory-dialog" },
    {}
  );

  return dialog;
}

function renderInventoryDialog(): void {
  if (!dialogElement) return;

  const hasItems = state.items.length > 0;
  const itemsHtml = hasItems
    ? `<div class="at-inventory-grid">${state.items.map((item) => renderInventoryGridItem(item)).join("")}</div>`
    : `<div class="at-inventory-empty">Your bag is empty. Explore and collect artifacts!</div>`;

  dialogElement.innerHTML = `
    <div class="at-inventory-dialog-header">
      <span class="at-inventory-dialog-title">${getIconHtml("inventory", 24)} Inventory</span>
      <span class="at-inventory-dialog-count">${state.items.length} items</span>
      ${hasItems ? `<button class="at-inventory-return-all" data-action="return-all">Return All</button>` : ""}
      <button class="at-inventory-dialog-close" data-action="close">${getIconHtml("close", 20)}</button>
    </div>
    <div class="at-inventory-dialog-content">
      ${itemsHtml}
    </div>
  `;

  // Add event listeners
  const closeBtn = dialogElement.querySelector('[data-action="close"]');
  closeBtn?.addEventListener("click", () => closeInventory());

  // Return all button
  const returnAllBtn = dialogElement.querySelector('[data-action="return-all"]');
  returnAllBtn?.addEventListener("click", () => returnAllItems());

  // Add grid item listeners (click to show tooltip)
  const gridItems = dialogElement.querySelectorAll(".at-inventory-grid-item");
  gridItems.forEach((gridItem) => {
    const itemId = gridItem.getAttribute("data-item-id");
    if (!itemId) return;

    // Click - toggle tooltip
    gridItem.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.focusedItemId === itemId) {
        // Clicking same item hides tooltip
        hideTooltip();
      } else {
        showTooltipForItem(itemId);
      }
    });

    // Keyboard Enter - show tooltip
    gridItem.addEventListener("keydown", (e) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
        e.preventDefault();
        if (state.focusedItemId === itemId) {
          hideTooltip();
        } else {
          showTooltipForItem(itemId);
        }
      }
    });
  });

  // Setup keyboard navigation for the dialog
  setupInventoryKeyboardNavigation();
}

function renderInventoryGridItem(item: InventoryItem): string {
  const iconName = getArtifactIconName(item.artifact.type);
  const icon = getIconHtml(iconName as any, 32);

  return `
    <div class="at-inventory-grid-item" 
         data-item-id="${item.id}" 
         tabindex="0"
         role="button"
         aria-label="${ARTIFACT_TYPE_LABELS[item.artifact.type]}">
      <span class="at-inventory-grid-item-icon">${icon}</span>
    </div>
  `;
}

// ============================================
// Tooltip
// ============================================

const TOOLTIP_ID = "adventure-time-inventory-tooltip";

function createTooltipElement(): HTMLDivElement {
  const tooltip = createElement(
    "div",
    { id: TOOLTIP_ID, class: "at-inventory-tooltip" },
    {}
  );
  return tooltip;
}

function showTooltipForItem(itemId: string): void {
  const item = state.items.find((i) => i.id === itemId);
  if (!item || !tooltipElement) return;

  state.focusedItemId = itemId;

  const iconName = getArtifactIconName(item.artifact.type);
  const icon = getIconHtml(iconName as any, 28);
  const label = ARTIFACT_TYPE_LABELS[item.artifact.type];

  tooltipElement.innerHTML = `
    <div class="at-inventory-tooltip-header">
      <span class="at-inventory-tooltip-icon">${icon}</span>
      <span class="at-inventory-tooltip-title">${label}</span>
    </div>
    <div class="at-inventory-tooltip-content">
      <div class="at-inventory-tooltip-preview">${item.originalContent}</div>
    </div>
    ${item.originalHref ? `<div class="at-inventory-tooltip-link">→ ${item.originalHref}</div>` : ""}
    <div class="at-inventory-tooltip-hint">Press Esc to close • Tab to navigate</div>
  `;

  tooltipElement.classList.add("at-inventory-tooltip--visible");
}

function hideTooltip(): void {
  if (!tooltipElement) return;
  state.focusedItemId = null;
  tooltipElement.classList.remove("at-inventory-tooltip--visible");
}

// ============================================
// Keyboard Navigation
// ============================================

let inventoryKeyboardHandler: ((e: KeyboardEvent) => void) | null = null;

function setupInventoryKeyboardNavigation(): void {
  // Remove existing handler if any
  if (inventoryKeyboardHandler) {
    document.removeEventListener("keydown", inventoryKeyboardHandler);
  }

  inventoryKeyboardHandler = (e: KeyboardEvent) => {
    if (!state.isOpen) return;

    // Escape - close tooltip first, then close inventory
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      
      if (state.focusedItemId) {
        // If tooltip is visible, just hide it
        hideTooltip();
        // Blur the currently focused element
        (document.activeElement as HTMLElement)?.blur();
      } else {
        // Close inventory
        closeInventory();
      }
      return;
    }

    // Tab navigation is handled natively by tabindex
    // But we ensure tooltip shows on focus via event listeners
  };

  document.addEventListener("keydown", inventoryKeyboardHandler);

  // Add to cleanup
  cleanupFunctions.push(() => {
    if (inventoryKeyboardHandler) {
      document.removeEventListener("keydown", inventoryKeyboardHandler);
      inventoryKeyboardHandler = null;
    }
  });
}

// ============================================
// Artifact Click Handler
// ============================================

function setupArtifactClickHandler(): void {
  artifactClickHandler = (e: Event) => {
    const target = e.target as HTMLElement;

    // Check if clicked element is an artifact
    if (target.classList.contains("at-artifact")) {
      e.preventDefault();
      e.stopPropagation();

      // Find the artifact by matching the icon element
      if (getArtifactsFunc) {
        const artifacts = getArtifactsFunc();
        const artifact = artifacts.find((a) => a.iconElement === target);

        if (artifact && !isStoryModeActive()) {
          // Only allow clicking artifacts within the viewport
          if (isArtifactInViewport(artifact.iconElement)) {
            // Get artifact's screen position and move towards it
            // Collision detection will trigger story mode when avatar reaches it
            const rect = artifact.iconElement.getBoundingClientRect();
            const artifactCenterX = rect.left + rect.width / 2;
            const artifactCenterY = rect.top + rect.height / 2;
            moveToPosition(artifactCenterX, artifactCenterY);
          }
        }
      }
    }
  };

  document.addEventListener("click", artifactClickHandler, true);

  cleanupFunctions.push(() => {
    if (artifactClickHandler) {
      document.removeEventListener("click", artifactClickHandler, true);
    }
  });
}

/**
 * Checks if an artifact element is within the game viewport.
 * The viewport is centered on the screen.
 */
function isArtifactInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const elementCenterX = rect.left + rect.width / 2;
  const elementCenterY = rect.top + rect.height / 2;

  // Get the viewport element to determine its bounds
  const viewport = document.getElementById("adventure-time-viewport");
  if (!viewport) {
    // Fallback: if no viewport found, allow the click
    return true;
  }

  const viewportRect = viewport.getBoundingClientRect();

  // Check if the artifact's center is within the viewport bounds
  return (
    elementCenterX >= viewportRect.left &&
    elementCenterX <= viewportRect.right &&
    elementCenterY >= viewportRect.top &&
    elementCenterY <= viewportRect.bottom
  );
}

// ============================================
// Keyboard Shortcuts
// ============================================

function setupKeyboardShortcuts(): void {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl+I or Cmd+I to toggle inventory
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      toggleInventory();
    }

    // Escape to close inventory
    if (event.key === "Escape") {
      if (state.isOpen) {
        closeInventory();
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  cleanupFunctions.push(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });
}

// ============================================
// Styles
// ============================================
