// Inventory feature implementation

import { createElement, injectStyles, generateId } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { Artifact } from "../interaction/types";
import { ARTIFACT_ICONS } from "../interaction/types";
import { pauseInput, resumeInput } from "../input";
import type {
  InventoryFeatureConfig,
  InventoryItem,
  InventoryState,
} from "./types";
import { ARTIFACT_TYPE_LABELS, ARTIFACT_ACTION_LABELS } from "./types";

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
let removeArtifactFunc: ((id: string) => void) | null = null;
let currentPopoverArtifact: Artifact | null = null;
let artifactClickHandler: ((e: Event) => void) | null = null;

// Collision cooldown to prevent re-triggering after dismissing popover
let lastDismissedArtifactId: string | null = null;
let collisionCooldownUntil: number = 0;
const COLLISION_COOLDOWN_MS = 500; // 500ms cooldown after dismissing

const INVENTORY_STYLES_ID = "adventure-time-inventory-styles";
const BAG_ID = "adventure-time-inventory-bag";
const DIALOG_ID = "adventure-time-inventory-dialog";
const POPOVER_ID = "adventure-time-artifact-popover";

export function initInventory(
  featureConfig: InventoryFeatureConfig,
  getArtifacts: () => Artifact[],
  removeArtifact: (id: string) => void
): void {
  if (isInitialized) {
    console.warn("Inventory already initialized");
    return;
  }

  config = { enabled: true, debug: false, ...featureConfig };
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

  // Inject styles
  const styleCleanup = injectStyles(getInventoryStyles(), INVENTORY_STYLES_ID);
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
  lastDismissedArtifactId = null;
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
    if (getArtifactsFunc && !currentPopoverArtifact) {
      // Check if we're still in cooldown period
      const now = Date.now();
      if (now < collisionCooldownUntil) {
        collisionCheckInterval = requestAnimationFrame(checkCollisions);
        return;
      }

      const artifacts = getArtifactsFunc();
      const collidingArtifact = findCollidingArtifact(artifacts);

      if (collidingArtifact) {
        // Skip if this is the same artifact we just dismissed and we're still near it
        if (collidingArtifact.id === lastDismissedArtifactId) {
          // Clear the dismissed artifact ID once we've moved away
          // (this happens naturally when collision check returns null)
          collisionCheckInterval = requestAnimationFrame(checkCollisions);
          return;
        }
        showArtifactPopover(collidingArtifact);
      } else {
        // No collision - clear the last dismissed artifact ID
        lastDismissedArtifactId = null;
      }
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

// ============================================
// Artifact Popover
// ============================================

function showArtifactPopover(artifact: Artifact): void {
  if (!popoverElement) return;

  currentPopoverArtifact = artifact;

  // Extract original content - use outerHTML for void elements like <img>
  const originalContent = getElementContent(artifact.sourceElement);
  const originalHref = artifact.sourceElement.getAttribute("href") || undefined;

  // Build popover content
  const icon = ARTIFACT_ICONS[artifact.type];
  const label = ARTIFACT_TYPE_LABELS[artifact.type];
  const actionLabel = ARTIFACT_ACTION_LABELS[artifact.type];
  const isPortal = artifact.type === "portal";

  popoverElement.innerHTML = `
    <div class="at-popover-header">
      <span class="at-popover-icon">${icon}</span>
      <span class="at-popover-title">${label}</span>
      <button class="at-popover-close" tabindex="0" data-action="close" aria-label="Close">✕</button>
    </div>
    <div class="at-popover-content">
      <div class="at-popover-preview">${originalContent}</div>
      ${originalHref ? `<div class="at-popover-link">→ ${originalHref}</div>` : ""}
    </div>
    <div class="at-popover-actions">
      <button class="at-popover-btn at-popover-btn--primary" tabindex="0" data-action="take">${actionLabel}</button>
      <button class="at-popover-btn at-popover-btn--secondary" tabindex="0" data-action="leave">Leave</button>
    </div>
  `;

  // Add event listeners
  const closeBtn = popoverElement.querySelector('[data-action="close"]') as HTMLButtonElement;
  const takeBtn = popoverElement.querySelector('[data-action="take"]') as HTMLButtonElement;
  const leaveBtn = popoverElement.querySelector('[data-action="leave"]') as HTMLButtonElement;

  closeBtn?.addEventListener("click", () => hideArtifactPopover(true));
  leaveBtn?.addEventListener("click", () => hideArtifactPopover(true));
  takeBtn?.addEventListener("click", () => {
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

  // Setup focus trap for keyboard navigation
  setupPopoverFocusTrap(popoverElement, takeBtn, leaveBtn, closeBtn);

  popoverElement.classList.add("at-popover--visible");

  // Pause movement input while popover is open
  pauseInput();

  // Focus the primary action button (Take/Travel) after a short delay for animation
  requestAnimationFrame(() => {
    takeBtn?.focus();
  });
}

function hideArtifactPopover(wasDismissedByUser: boolean = false): void {
  if (!popoverElement) return;

  // Track the dismissed artifact to prevent immediate re-collision
  if (wasDismissedByUser && currentPopoverArtifact) {
    lastDismissedArtifactId = currentPopoverArtifact.id;
    collisionCooldownUntil = Date.now() + COLLISION_COOLDOWN_MS;
  }

  popoverElement.classList.remove("at-popover--visible");
  currentPopoverArtifact = null;

  // Remove focus trap handler
  if (popoverFocusTrapHandler) {
    popoverElement.removeEventListener("keydown", popoverFocusTrapHandler);
    popoverFocusTrapHandler = null;
  }

  // Resume movement input
  resumeInput();
}

/**
 * Returns whether the artifact popover is currently visible
 */
export function isPopoverVisible(): boolean {
  return currentPopoverArtifact !== null;
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
 * For complex styled elements (cards, tags), returns outerHTML to preserve styling.
 * For other elements, returns innerHTML.
 */
function getElementContent(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  
  // Void elements that have no innerHTML - use outerHTML instead
  const voidElements = ['img', 'br', 'hr', 'input', 'embed', 'area', 'base', 'col', 'link', 'meta', 'source', 'track', 'wbr'];
  
  if (voidElements.includes(tagName)) {
    // For images, create a constrained version to fit in the preview
    if (tagName === 'img') {
      const clone = element.cloneNode(true) as HTMLImageElement;
      clone.style.maxWidth = '100%';
      clone.style.maxHeight = '150px';
      clone.style.objectFit = 'contain';
      clone.style.borderRadius = '8px';
      return clone.outerHTML;
    }
    return element.outerHTML;
  }
  
  // For elements with no innerHTML but meaningful content (like empty divs with background images)
  if (!element.innerHTML.trim() && element.classList.contains('image-placeholder')) {
    return element.outerHTML;
  }
  
  // For complex styled elements (cards, tags), use outerHTML to preserve their styling
  // These elements have CSS classes that define their appearance
  if (element.classList.contains('card') || element.classList.contains('tag')) {
    const clone = element.cloneNode(true) as HTMLElement;
    // Ensure the element displays properly in the preview container
    clone.style.margin = '0';
    clone.style.display = 'inline-block';
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

  // Remove from interaction layer
  if (removeArtifactFunc) {
    removeArtifactFunc(artifact.id);
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

  const itemsHtml = state.items.length === 0
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
  const accordionHeaders = dialogElement.querySelectorAll(".at-inventory-item-header");
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
    <div class="at-inventory-item ${isExpanded ? "at-inventory-item--expanded" : ""}">
      <div class="at-inventory-item-header" data-item-id="${item.id}">
        <span class="at-inventory-item-icon">${icon}</span>
        <span class="at-inventory-item-label">${label}</span>
        <span class="at-inventory-item-chevron">${isExpanded ? "▼" : "▶"}</span>
      </div>
      <div class="at-inventory-item-content">
        <div class="at-inventory-item-preview">${item.originalContent}</div>
        ${item.originalHref ? `<div class="at-inventory-item-link">→ ${item.originalHref}</div>` : ""}
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

function getInventoryStyles(): string {
  return `
    /* Inventory Bag */
    .at-inventory-bag {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: linear-gradient(145deg, #8B4513, #654321);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      border: 3px solid #A0522D;
    }

    .at-inventory-bag:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
    }

    .at-bag-icon {
      font-size: 28px;
    }

    .at-bag-counter {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 22px;
      height: 22px;
      background: #e74c3c;
      color: white;
      border-radius: 11px;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      opacity: 0;
      transform: scale(0);
      transition: opacity 0.2s ease, transform 0.2s ease;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .at-bag-counter--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Inventory Dialog */
    .at-inventory-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 90%;
      max-width: 500px;
      max-height: 70vh;
      background: linear-gradient(180deg, #2c2c2c 0%, #1a1a1a 100%);
      border-radius: 16px;
      z-index: 1000002;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      border: 1px solid #444;
      display: flex;
      flex-direction: column;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .at-inventory-dialog--open {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, -50%) scale(1);
    }

    .at-inventory-dialog-header {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #444;
      gap: 12px;
    }

    .at-inventory-dialog-title {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
    }

    .at-inventory-dialog-count {
      font-size: 14px;
      color: #888;
      margin-left: auto;
    }

    .at-inventory-dialog-close {
      background: transparent;
      border: none;
      color: #888;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .at-inventory-dialog-close:hover {
      background: #444;
      color: #fff;
    }

    .at-inventory-dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .at-inventory-empty {
      text-align: center;
      color: #666;
      padding: 40px 20px;
      font-size: 14px;
    }

    /* Inventory Item (Accordion) */
    .at-inventory-item {
      background: #333;
      border-radius: 8px;
      margin-bottom: 8px;
      overflow: hidden;
    }

    .at-inventory-item-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s ease;
      gap: 12px;
    }

    .at-inventory-item-header:hover {
      background: #3a3a3a;
    }

    .at-inventory-item-icon {
      font-size: 24px;
    }

    .at-inventory-item-label {
      flex: 1;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
    }

    .at-inventory-item-chevron {
      color: #666;
      font-size: 12px;
      transition: transform 0.2s ease;
    }

    .at-inventory-item-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      background: #2a2a2a;
    }

    .at-inventory-item--expanded .at-inventory-item-content {
      max-height: 300px;
    }

    .at-inventory-item-preview {
      padding: 16px;
      color: #ccc;
      font-size: 13px;
      line-height: 1.5;
      max-height: 200px;
      overflow-y: auto;
    }

    .at-inventory-item-link {
      padding: 8px 16px;
      color: #3498db;
      font-size: 12px;
      border-top: 1px solid #333;
    }

    /* Artifact Popover */
    .at-popover {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 90%;
      max-width: 400px;
      background: linear-gradient(180deg, #fff 0%, #f5f5f5 100%);
      border-radius: 16px;
      z-index: 1000003;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      font-family: system-ui, -apple-system, sans-serif;
    }

    .at-popover--visible {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, -50%) scale(1);
    }

    .at-popover-header {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
      gap: 12px;
    }

    .at-popover-icon {
      font-size: 32px;
    }

    .at-popover-title {
      flex: 1;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .at-popover-close {
      background: transparent;
      border: none;
      color: #999;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .at-popover-close:hover {
      background: #eee;
      color: #333;
    }

    .at-popover-content {
      padding: 16px 20px;
      max-height: 200px;
      overflow-y: auto;
    }

    .at-popover-preview {
      color: #555;
      font-size: 14px;
      line-height: 1.6;
    }

    .at-popover-link {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #eee;
      color: #3498db;
      font-size: 13px;
    }

    .at-popover-actions {
      display: flex;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid #eee;
    }

    .at-popover-btn {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.1s ease;
    }

    .at-popover-btn:active {
      transform: scale(0.98);
    }

    .at-popover-btn--primary {
      background: linear-gradient(145deg, #4CAF50, #45a049);
      color: white;
    }

    .at-popover-btn--primary:hover {
      background: linear-gradient(145deg, #45a049, #3d8b40);
    }

    .at-popover-btn--secondary {
      background: #eee;
      color: #666;
    }

    .at-popover-btn--secondary:hover {
      background: #ddd;
    }

    /* Focus styles for keyboard navigation */
    .at-popover-btn:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.4);
    }

    .at-popover-btn--primary:focus {
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.6);
    }

    .at-popover-btn--secondary:focus {
      box-shadow: 0 0 0 3px rgba(100, 100, 100, 0.4);
    }

    .at-popover-close:focus {
      outline: none;
      background: #eee;
      box-shadow: 0 0 0 2px rgba(100, 100, 100, 0.4);
    }

    .at-inventory-dialog-close:focus {
      outline: none;
      background: #444;
      color: #fff;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
    }
  `;
}

