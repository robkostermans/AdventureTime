// Inventory feature implementation

import { createElement, injectStyles, generateId } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { Artifact } from "../interaction/types";
import { ARTIFACT_ICONS } from "../interaction/types";
import type { GhostMarker } from "../interaction/types";
import {
  createGhostMarker,
  getGhostMarkers,
  getIntroConfig,
} from "../interaction";
import { pauseInput, resumeInput } from "../input";
import {
  isStoryModeEnabled,
  isStoryModeActive,
  showStoryMode,
  setStoryModeCallbacks,
} from "../storymode";
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
let popoverElement: HTMLDivElement | null = null;

// State
let state: InventoryState = {
  items: [],
  isOpen: false,
  expandedItemId: null,
};

// Collision detection
let collisionCheckInterval: number | null = null;
let getArtifactsFunc: (() => Artifact[]) | null = null;
let removeArtifactFunc:
  | ((id: string) => { x: number; y: number } | null)
  | null = null;
let currentPopoverArtifact: Artifact | null = null;
let currentPopoverGhostMarker: GhostMarker | null = null;
let artifactClickHandler: ((e: Event) => void) | null = null;

// Collision cooldown to prevent re-triggering after dismissing popover
let lastDismissedArtifactId: string | null = null;
let lastDismissedGhostMarkerId: string | null = null;
let collisionCooldownUntil: number = 0;
const COLLISION_COOLDOWN_MS = 500; // 500ms cooldown after dismissing

const INVENTORY_STYLES_ID = "adventure-time-inventory-styles";
const BAG_ID = "adventure-time-inventory-bag";
const DIALOG_ID = "adventure-time-inventory-dialog";
const POPOVER_ID = "adventure-time-artifact-popover";

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

  // Reset state
  state = {
    items: [],
    isOpen: false,
    expandedItemId: null,
  };

  // Inject styles from CSS module
  const styleCleanup = injectStyles(inventoryStyles, INVENTORY_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create UI elements
  bagElement = createBagElement();
  dialogElement = createDialogElement();
  popoverElement = createPopoverElement();

  document.body.appendChild(bagElement);
  document.body.appendChild(dialogElement);
  document.body.appendChild(popoverElement);

  cleanupFunctions.push(() => {
    bagElement?.remove();
    dialogElement?.remove();
    popoverElement?.remove();
  });

  // Setup keyboard shortcut (Ctrl+I)
  setupKeyboardShortcuts();

  // Setup artifact click handler
  setupArtifactClickHandler();

  // Setup story mode callbacks if story mode is enabled
  if (config.useStoryMode && isStoryModeEnabled()) {
    setStoryModeCallbacks(handleStoryModeTake, handleStoryModeLeave);
  }

  // Start collision detection
  startCollisionDetection();

  isInitialized = true;

  if (config.debug) {
    console.log("Inventory initialized", config);
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
  popoverElement = null;
  getArtifactsFunc = null;
  removeArtifactFunc = null;
  currentPopoverArtifact = null;
  currentPopoverGhostMarker = null;
  lastDismissedArtifactId = null;
  lastDismissedGhostMarkerId = null;
  collisionCooldownUntil = 0;

  state = {
    items: [],
    isOpen: false,
    expandedItemId: null,
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

  // Close any open popover first
  if (currentPopoverArtifact) {
    hideArtifactPopover();
  }

  state.isOpen = true;
  state.expandedItemId = null;
  renderInventoryDialog();
  dialogElement.classList.add("at-inventory-dialog--open");
}

export function closeInventory(): void {
  if (!dialogElement) return;

  state.isOpen = false;
  state.expandedItemId = null;
  dialogElement.classList.remove("at-inventory-dialog--open");
}

// ============================================
// Collision Detection
// ============================================

function startCollisionDetection(): void {
  const checkCollisions = () => {
    // Skip if popover is already showing or story mode is active
    if (
      currentPopoverArtifact ||
      currentPopoverGhostMarker ||
      isStoryModeActive()
    ) {
      collisionCheckInterval = requestAnimationFrame(checkCollisions);
      return;
    }

    // Check if we're still in cooldown period
    const now = Date.now();
    if (now < collisionCooldownUntil) {
      collisionCheckInterval = requestAnimationFrame(checkCollisions);
      return;
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
        // Use story mode or popover based on config
        if (config.useStoryMode && isStoryModeEnabled()) {
          showArtifactStoryMode(collidingArtifact);
        } else {
          showArtifactPopover(collidingArtifact);
        }
        collisionCheckInterval = requestAnimationFrame(checkCollisions);
        return;
      } else {
        // No artifact collision - clear the last dismissed artifact ID
        lastDismissedArtifactId = null;
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
      showGhostMarkerPopover(collidingGhost);
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
// Artifact Popover
// ============================================

function showArtifactPopover(artifact: Artifact): void {
  if (!popoverElement) return;

  currentPopoverArtifact = artifact;

  // Check if this is an intro artifact
  const isIntro = artifact.isIntro === true;
  const introConfig = isIntro ? getIntroConfig() : null;

  // Extract original content - use outerHTML for void elements like <img>
  // For intro artifacts, show the original header content above the intro text
  let originalContent: string;
  if (isIntro && introConfig?.text) {
    const headerContent = getElementContent(artifact.sourceElement);
    originalContent = `<div class="at-intro-header">${headerContent}</div><p class="at-intro-text">${introConfig.text}</p>`;
  } else {
    originalContent = getElementContent(artifact.sourceElement);
  }
  const originalHref = artifact.sourceElement.getAttribute("href") || undefined;

  // Build popover content
  // For intro, use custom icon and title from config
  const icon =
    isIntro && introConfig?.icon
      ? introConfig.icon
      : ARTIFACT_ICONS[artifact.type];
  const label =
    isIntro && introConfig?.title
      ? introConfig.title
      : ARTIFACT_TYPE_LABELS[artifact.type];
  const actionLabel = ARTIFACT_ACTION_LABELS[artifact.type];
  const isPortal = artifact.type === "portal";
  const isDirection = artifact.type === "direction";
  const hasAction = actionLabel !== null;

  // For intro artifacts, the button should say "Start" instead of "Leave"
  const leaveButtonLabel = isIntro ? "Start" : "Leave";

  popoverElement.innerHTML = `
    <div class="at-popover-header">
      <span class="at-popover-icon">${icon}</span>
      <span class="at-popover-title">${label}</span>
      <button class="at-popover-close" tabindex="0" data-action="close" aria-label="Close">✕</button>
    </div>
    <div class="at-popover-content">
      <div class="at-popover-preview${
        isIntro ? " at-popover-preview--intro" : ""
      }">${originalContent}</div>
    </div>
    <div class="at-popover-actions">
      ${
        hasAction
          ? `<button class="at-popover-btn at-popover-btn--primary" tabindex="0" data-action="take">${actionLabel}</button>`
          : ""
      }
      <button class="at-popover-btn ${
        hasAction ? "at-popover-btn--secondary" : "at-popover-btn--primary"
      }" tabindex="0" data-action="leave">${leaveButtonLabel}</button>
    </div>
  `;

  // Add event listeners
  const closeBtn = popoverElement.querySelector(
    '[data-action="close"]'
  ) as HTMLButtonElement;
  const takeBtn = popoverElement.querySelector(
    '[data-action="take"]'
  ) as HTMLButtonElement | null;
  const leaveBtn = popoverElement.querySelector(
    '[data-action="leave"]'
  ) as HTMLButtonElement;

  closeBtn?.addEventListener("click", () => hideArtifactPopover(true));
  leaveBtn?.addEventListener("click", () => hideArtifactPopover(true));

  if (takeBtn) {
    takeBtn.addEventListener("click", () => {
      if (isPortal) {
        // Portal: Travel action (placeholder for now)
        if (config.debug) {
          console.log("Travel action triggered for portal:", originalHref);
        }
        // For now, just close the popover - Travel feature will be added later
        hideArtifactPopover(true);
      } else {
        // Collect the artifact
        collectArtifact(artifact, originalContent, originalHref);
      }
    });
  }

  // Setup focus trap for keyboard navigation
  setupPopoverFocusTrap(popoverElement, takeBtn, leaveBtn, closeBtn);

  popoverElement.classList.add("at-popover--visible");

  // Pause movement input while popover is open
  pauseInput();

  // Focus the primary action button (Take/Travel for most, Leave/Start for direction)
  requestAnimationFrame(() => {
    if (hasAction && takeBtn) {
      takeBtn.focus();
    } else {
      leaveBtn?.focus();
    }
  });
}

function hideArtifactPopover(wasDismissedByUser: boolean = false): void {
  if (!popoverElement) return;

  // Track the dismissed artifact to prevent immediate re-collision
  if (wasDismissedByUser && currentPopoverArtifact) {
    lastDismissedArtifactId = currentPopoverArtifact.id;
    collisionCooldownUntil = Date.now() + COLLISION_COOLDOWN_MS;
  }

  // Track dismissed ghost marker
  if (wasDismissedByUser && currentPopoverGhostMarker) {
    lastDismissedGhostMarkerId = currentPopoverGhostMarker.id;
    collisionCooldownUntil = Date.now() + COLLISION_COOLDOWN_MS;
  }

  popoverElement.classList.remove("at-popover--visible");
  currentPopoverArtifact = null;
  currentPopoverGhostMarker = null;

  // Remove focus trap handler
  if (popoverFocusTrapHandler) {
    popoverElement.removeEventListener("keydown", popoverFocusTrapHandler);
    popoverFocusTrapHandler = null;
  }

  // Resume movement input
  resumeInput();
}

/**
 * Shows a popover for a ghost marker (collected artifact location)
 * Ghost markers only have a "Leave" action - you can't take them again
 */
function showGhostMarkerPopover(ghost: GhostMarker): void {
  if (!popoverElement) return;

  currentPopoverGhostMarker = ghost;

  // Build popover content - show original content but with "Memory" title
  const icon = "⭐";
  const originalIcon = ARTIFACT_ICONS[ghost.originalType];
  const label = `Memory of ${ARTIFACT_TYPE_LABELS[ghost.originalType]}`;

  popoverElement.innerHTML = `
    <div class="at-popover-header">
      <span class="at-popover-icon">${icon}</span>
      <span class="at-popover-title">${label}</span>
      <button class="at-popover-close" tabindex="0" data-action="close" aria-label="Close">✕</button>
    </div>
    <div class="at-popover-content">
      <div class="at-popover-memory-note">
        <span class="at-popover-memory-icon">${originalIcon}</span>
        You collected this item here
      </div>
      <div class="at-popover-preview">${ghost.originalContent}</div>
    </div>
    <div class="at-popover-actions">
      <button class="at-popover-btn at-popover-btn--primary" tabindex="0" data-action="leave">Continue</button>
    </div>
  `;

  // Add event listeners
  const closeBtn = popoverElement.querySelector(
    '[data-action="close"]'
  ) as HTMLButtonElement;
  const leaveBtn = popoverElement.querySelector(
    '[data-action="leave"]'
  ) as HTMLButtonElement;

  closeBtn?.addEventListener("click", () => hideArtifactPopover(true));
  leaveBtn?.addEventListener("click", () => hideArtifactPopover(true));

  // Setup focus trap for keyboard navigation
  setupPopoverFocusTrap(popoverElement, null, leaveBtn, closeBtn);

  popoverElement.classList.add("at-popover--visible");

  // Pause movement input while popover is open
  pauseInput();

  // Focus the Continue button
  requestAnimationFrame(() => {
    leaveBtn?.focus();
  });
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

  showStoryMode(
    artifact,
    headerContent,
    isIntro,
    introText,
    currentStoryModeHref
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

  if (isPortal) {
    // Portal: Travel action (placeholder for now)
    if (config.debug) {
      console.log("Travel action triggered for portal:", currentStoryModeHref);
    }
    // For now, just handle as leave - Travel feature will be added later
    handleStoryModeLeave(artifactId);
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
 * Handle "Leave" action from story mode
 */
function handleStoryModeLeave(artifactId: string): void {
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
 * Returns whether the artifact popover is currently visible
 */
export function isPopoverVisible(): boolean {
  return currentPopoverArtifact !== null || currentPopoverGhostMarker !== null;
}

// Focus trap handler reference
let popoverFocusTrapHandler: ((e: KeyboardEvent) => void) | null = null;

/**
 * Sets up focus trapping within the popover for keyboard navigation
 */
function setupPopoverFocusTrap(
  popover: HTMLElement,
  takeBtn: HTMLButtonElement | null,
  leaveBtn: HTMLButtonElement | null,
  closeBtn: HTMLButtonElement | null
): void {
  const focusableElements = [takeBtn, leaveBtn, closeBtn].filter(
    (el): el is HTMLButtonElement => el !== null
  );

  if (focusableElements.length === 0) return;

  popoverFocusTrapHandler = (e: KeyboardEvent) => {
    // Handle Tab key for focus trapping
    if (e.key === "Tab") {
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (e.shiftKey) {
        // Shift+Tab: go backwards
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: go forwards
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    // Handle arrow keys for button navigation
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const activeElement = document.activeElement;
      const currentIndex = focusableElements.indexOf(
        activeElement as HTMLButtonElement
      );

      if (currentIndex !== -1) {
        let nextIndex: number;
        if (e.key === "ArrowRight") {
          nextIndex = (currentIndex + 1) % focusableElements.length;
        } else {
          nextIndex =
            (currentIndex - 1 + focusableElements.length) %
            focusableElements.length;
        }
        focusableElements[nextIndex].focus();
      }
    }
  };

  popover.addEventListener("keydown", popoverFocusTrapHandler);
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
  // Create inventory item
  const item: InventoryItem = {
    id: generateId("inv-item"),
    artifact,
    collectedAt: Date.now(),
    originalContent,
    originalHref,
  };

  // Add to inventory
  state.items.push(item);

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

  // Hide popover
  hideArtifactPopover();

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
    <span class="at-bag-icon">🎒</span>
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

  const itemsHtml =
    state.items.length === 0
      ? `<div class="at-inventory-empty">Your bag is empty. Explore and collect artifacts!</div>`
      : state.items.map((item) => renderInventoryItem(item)).join("");

  dialogElement.innerHTML = `
    <div class="at-inventory-dialog-header">
      <span class="at-inventory-dialog-title">🎒 Inventory</span>
      <span class="at-inventory-dialog-count">${state.items.length} items</span>
      <button class="at-inventory-dialog-close" data-action="close">✕</button>
    </div>
    <div class="at-inventory-dialog-content">
      ${itemsHtml}
    </div>
  `;

  // Add event listeners
  const closeBtn = dialogElement.querySelector('[data-action="close"]');
  closeBtn?.addEventListener("click", () => closeInventory());

  // Add accordion listeners
  const accordionHeaders = dialogElement.querySelectorAll(
    ".at-inventory-item-header"
  );
  accordionHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const itemId = header.getAttribute("data-item-id");
      if (itemId) {
        toggleItemExpanded(itemId);
      }
    });
  });
}

function renderInventoryItem(item: InventoryItem): string {
  const icon = ARTIFACT_ICONS[item.artifact.type];
  const label = ARTIFACT_TYPE_LABELS[item.artifact.type];
  const isExpanded = state.expandedItemId === item.id;

  return `
    <div class="at-inventory-item ${
      isExpanded ? "at-inventory-item--expanded" : ""
    }">
      <div class="at-inventory-item-header" data-item-id="${item.id}">
        <span class="at-inventory-item-icon">${icon}</span>
        <span class="at-inventory-item-label">${label}</span>
        <span class="at-inventory-item-chevron">${isExpanded ? "▼" : "▶"}</span>
      </div>
      <div class="at-inventory-item-content">
        <div class="at-inventory-item-preview">${item.originalContent}</div>
        ${
          item.originalHref
            ? `<div class="at-inventory-item-link">→ ${item.originalHref}</div>`
            : ""
        }
      </div>
    </div>
  `;
}

function toggleItemExpanded(itemId: string): void {
  if (state.expandedItemId === itemId) {
    state.expandedItemId = null;
  } else {
    state.expandedItemId = itemId;
  }
  renderInventoryDialog();
}

// ============================================
// Popover Element
// ============================================

function createPopoverElement(): HTMLDivElement {
  const popover = createElement(
    "div",
    { id: POPOVER_ID, class: "at-popover" },
    {}
  );

  return popover;
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

        if (artifact && !currentPopoverArtifact) {
          // Check if artifact is within the viewport before allowing interaction
          if (isArtifactInViewport(artifact.iconElement)) {
            showArtifactPopover(artifact);
          } else if (config.debug) {
            console.log("Artifact clicked but outside viewport, ignoring");
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

    // Escape to close popover or inventory
    if (event.key === "Escape") {
      if (currentPopoverArtifact) {
        hideArtifactPopover(true); // User dismissed, enable cooldown
      } else if (state.isOpen) {
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
