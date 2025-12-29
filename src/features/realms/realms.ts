// Realms feature implementation
// Displays visited realms and allows fast travel

import type { RealmsFeatureConfig } from "./types";
import type { CleanupFunction } from "../../core/types";
import { createElement } from "../../core/utils";
import {
  getVisitedRealms,
  getCurrentRealmUrl,
  clearVisitedRealmsExceptFirst,
  type VisitedRealm,
} from "../persistence";
import { getViewportContainer } from "../viewport";
import { travelToDestination } from "../travel";
import { pauseInput, resumeInput } from "../input";
import { isStoryModeActive, hideStoryMode } from "../storymode";
import cssContent from "./realms.css?inline";

let isInitialized = false;
let config: RealmsFeatureConfig;
let cleanupFunctions: CleanupFunction[] = [];

// DOM elements
let realmsButton: HTMLDivElement | null = null;
let realmsDialog: HTMLDivElement | null = null;
let realmsCounter: HTMLDivElement | null = null;

// State
let isDialogOpen = false;

/**
 * Initialize realms feature
 */
export function initRealms(featureConfig: RealmsFeatureConfig): void {
  if (isInitialized) {
    console.warn("Realms already initialized");
    return;
  }

  config = { debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  // Inject styles
  const styleElement = document.createElement("style");
  styleElement.textContent = cssContent;
  document.head.appendChild(styleElement);
  cleanupFunctions.push(() => styleElement.remove());

  // Create UI elements
  createRealmsButton();
  createRealmsDialog();

  // Update counter
  updateRealmsCounter();

  isInitialized = true;

  if (config.debug) {
    console.log("Realms feature initialized", config);
  }
}

/**
 * Destroy realms feature
 */
export function destroyRealms(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  realmsButton = null;
  realmsDialog = null;
  realmsCounter = null;
  isDialogOpen = false;
  isInitialized = false;
}

/**
 * Create the realms button
 */
function createRealmsButton(): void {
  const viewportContainer = getViewportContainer();
  if (!viewportContainer) {
    console.warn("Viewport container not found for realms button");
    return;
  }

  realmsButton = createElement(
    "div",
    { class: "at-realms-btn", role: "button", tabindex: "0" },
    {}
  ) as HTMLDivElement;

  const icon = createElement("span", { class: "at-realms-btn-icon" }, {});
  icon.textContent = "🗺️";
  realmsButton.appendChild(icon);

  realmsCounter = createElement("span", { class: "at-realms-counter" }, {}) as HTMLDivElement;
  realmsButton.appendChild(realmsCounter);

  // Event listeners
  realmsButton.addEventListener("click", toggleDialog);
  realmsButton.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDialog();
    }
  });

  viewportContainer.appendChild(realmsButton);
  cleanupFunctions.push(() => realmsButton?.remove());
}

/**
 * Create the realms dialog
 */
function createRealmsDialog(): void {
  const viewportContainer = getViewportContainer();
  if (!viewportContainer) {
    console.warn("Viewport container not found for realms dialog");
    return;
  }

  realmsDialog = createElement(
    "div",
    { class: "at-realms-dialog", role: "dialog", "aria-modal": "true" },
    {}
  ) as HTMLDivElement;

  viewportContainer.appendChild(realmsDialog);
  cleanupFunctions.push(() => realmsDialog?.remove());
}

/**
 * Toggle dialog open/close
 */
function toggleDialog(): void {
  if (isDialogOpen) {
    closeRealmsDialog();
  } else {
    openRealmsDialog();
  }
}

/**
 * Open the realms dialog
 */
export function openRealmsDialog(): void {
  if (!realmsDialog || isDialogOpen) return;

  // Close story mode if active
  if (isStoryModeActive()) {
    hideStoryMode();
  }

  renderRealmsDialog();
  realmsDialog.classList.add("at-realms-dialog--open");
  isDialogOpen = true;
  pauseInput();

  // Focus the close button
  const closeBtn = realmsDialog.querySelector(
    ".at-realms-dialog-close"
  ) as HTMLButtonElement;
  closeBtn?.focus();
}

/**
 * Close the realms dialog
 */
export function closeRealmsDialog(): void {
  if (!realmsDialog || !isDialogOpen) return;

  realmsDialog.classList.remove("at-realms-dialog--open");
  isDialogOpen = false;
  resumeInput();

  // Return focus to button
  realmsButton?.focus();
}

/**
 * Check if realms dialog is open
 */
export function isRealmsDialogOpen(): boolean {
  return isDialogOpen;
}

/**
 * Update the realms counter
 */
export function updateRealmsCounter(): void {
  if (!realmsCounter) return;

  const realms = getVisitedRealms();
  const count = realms.length;

  realmsCounter.textContent = count.toString();
  realmsCounter.classList.toggle("at-realms-counter--visible", count > 0);
}

/**
 * Render the realms dialog content
 */
function renderRealmsDialog(): void {
  if (!realmsDialog) return;

  const realms = getVisitedRealms();
  const currentUrl = getCurrentRealmUrl();

  // Sort by last visited (most recent first)
  const sortedRealms = [...realms].sort((a, b) => b.lastVisited - a.lastVisited);

  // Show "Forget All" button only if there's more than one realm
  const showForgetAll = realms.length > 1;

  realmsDialog.innerHTML = `
    <div class="at-realms-dialog-header">
      <span class="at-realms-dialog-title">🗺️ Visited Realms</span>
      <span class="at-realms-dialog-count">${realms.length} realm${realms.length !== 1 ? "s" : ""}</span>
      ${showForgetAll ? `<button class="at-realms-forget-all" data-action="forget-all">Forget All</button>` : ""}
      <button class="at-realms-dialog-close" aria-label="Close">✕</button>
    </div>
    <div class="at-realms-dialog-content">
      ${
        realms.length === 0
          ? '<div class="at-realms-empty">No realms visited yet.<br>Travel through portals to discover new realms!</div>'
          : `<div class="at-realms-list">
              ${sortedRealms
                .map((realm) => renderRealmItem(realm, realm.url === currentUrl))
                .join("")}
            </div>`
      }
    </div>
  `;

  // Add event listeners
  const closeBtn = realmsDialog.querySelector(".at-realms-dialog-close");
  closeBtn?.addEventListener("click", closeRealmsDialog);

  // Forget all button
  const forgetAllBtn = realmsDialog.querySelector('[data-action="forget-all"]');
  forgetAllBtn?.addEventListener("click", handleForgetAllRealms);

  // Add travel button listeners
  const travelBtns = realmsDialog.querySelectorAll(".at-realm-travel-btn");
  travelBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const url = (btn as HTMLElement).dataset.url;
      if (url) {
        handleFastTravel(url);
      }
    });
  });

  // Add realm item click listeners (for accessibility)
  const realmItems = realmsDialog.querySelectorAll(".at-realm-item");
  realmItems.forEach((item) => {
    item.addEventListener("keydown", (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
        const url = (item as HTMLElement).dataset.url;
        const isCurrent = item.classList.contains("at-realm-item--current");
        if (url && !isCurrent) {
          e.preventDefault();
          handleFastTravel(url);
        }
      }
    });
  });

  // Keyboard navigation for dialog
  realmsDialog.addEventListener("keydown", handleDialogKeydown);
}

/**
 * Render a single realm item
 */
function renderRealmItem(realm: VisitedRealm, isCurrent: boolean): string {
  return `
    <div class="at-realm-item${isCurrent ? " at-realm-item--current" : ""}" 
         data-url="${escapeHtml(realm.url)}"
         tabindex="0"
         role="button">
      <span class="at-realm-icon">${realm.icon}</span>
      <div class="at-realm-info">
        <div class="at-realm-title">${escapeHtml(realm.title)}</div>
        <div class="at-realm-url">${escapeHtml(realm.url)}</div>
      </div>
      ${
        isCurrent
          ? ""
          : `<button class="at-realm-travel-btn" data-url="${escapeHtml(realm.url)}">Travel</button>`
      }
    </div>
  `;
}

/**
 * Handle fast travel to a realm
 */
async function handleFastTravel(url: string): Promise<void> {
  closeRealmsDialog();

  // Build full URL
  const fullUrl = new URL(url, window.location.origin).href;

  // Use travel module for consistent navigation
  await travelToDestination({ url: fullUrl });
}

/**
 * Handle "Forget All" - clear all realms except the first one
 */
function handleForgetAllRealms(): void {
  clearVisitedRealmsExceptFirst();
  
  // Update UI
  updateRealmsCounter();
  renderRealmsDialog();
  
  if (config.debug) {
    console.log("All realms forgotten except the first one");
  }
}

/**
 * Handle keyboard navigation in dialog
 */
function handleDialogKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    closeRealmsDialog();
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

