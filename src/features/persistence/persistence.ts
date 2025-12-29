// Persistence feature implementation - localStorage for game state

import type { CleanupFunction } from "../../core/types";
import type {
  PersistenceFeatureConfig,
  StoredGameState,
  StoredInventoryItem,
  StoredPageState,
  StoredArtifactPosition,
  TravelHistoryEntry,
  VisitedRealm,
} from "./types";

let isInitialized = false;
let config: PersistenceFeatureConfig;
let storageKey: string;

const DEFAULT_STORAGE_PREFIX = "at";

/**
 * Get the current page URL (normalized)
 */
function getCurrentPageUrl(): string {
  // Use pathname + search to identify pages (ignore hash)
  return window.location.pathname + window.location.search;
}

/**
 * Get the page title
 */
function getCurrentPageTitle(): string {
  return document.title || window.location.pathname;
}

/**
 * Initialize persistence feature
 */
export function initPersistence(featureConfig: PersistenceFeatureConfig): void {
  if (isInitialized) {
    console.warn("Persistence already initialized");
    return;
  }

  config = { debug: false, storagePrefix: DEFAULT_STORAGE_PREFIX, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  storageKey = `${config.storagePrefix}_gameState`;

  // Initialize or update current page in state
  const state = getGameState();
  state.currentPageUrl = getCurrentPageUrl();
  saveGameState(state);

  isInitialized = true;

  if (config.debug) {
    console.log("Persistence initialized", config);
  }
}

/**
 * Destroy persistence feature
 */
export function destroyPersistence(): void {
  isInitialized = false;
}

/**
 * Get the complete game state from localStorage
 */
export function getGameState(): StoredGameState {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load game state from localStorage:", e);
  }

  // Return default state
  return {
    inventory: [],
    pages: {},
    travelHistory: [],
    visitedRealms: [],
    currentPageUrl: getCurrentPageUrl(),
  };
}

/**
 * Save the complete game state to localStorage
 */
export function saveGameState(state: StoredGameState): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save game state to localStorage:", e);
  }
}

/**
 * Get stored page state for a specific URL
 */
export function getPageState(url?: string): StoredPageState | null {
  const pageUrl = url || getCurrentPageUrl();
  const state = getGameState();
  return state.pages[pageUrl] || null;
}

/**
 * Save page state (artifact positions)
 */
export function savePageState(pageState: StoredPageState): void {
  const state = getGameState();
  state.pages[pageState.url] = pageState;
  saveGameState(state);
}

/**
 * Save artifact positions for the current page
 */
export function saveArtifactPositions(artifacts: StoredArtifactPosition[]): void {
  const url = getCurrentPageUrl();
  const pageState: StoredPageState = {
    url,
    artifacts,
    lastVisited: Date.now(),
  };
  savePageState(pageState);
}

/**
 * Get stored artifact positions for the current page
 */
export function getArtifactPositions(): StoredArtifactPosition[] | null {
  const pageState = getPageState();
  return pageState?.artifacts || null;
}

/**
 * Mark an artifact as collected
 */
export function markArtifactCollected(artifactId: string): void {
  const pageState = getPageState();
  if (pageState) {
    const artifact = pageState.artifacts.find((a) => a.id === artifactId);
    if (artifact) {
      artifact.collected = true;
      savePageState(pageState);
    }
  }
}

/**
 * Mark an artifact as returned (uncollected)
 */
export function markArtifactReturned(artifactId: string): void {
  const pageState = getPageState();
  if (pageState) {
    const artifact = pageState.artifacts.find((a) => a.id === artifactId);
    if (artifact) {
      artifact.collected = false;
      savePageState(pageState);
    }
  }
}

/**
 * Mark an artifact as returned (uncollected) on a specific page
 */
export function markArtifactReturnedOnPage(artifactId: string, pageUrl: string): void {
  const pageState = getPageState(pageUrl);
  if (pageState) {
    const artifact = pageState.artifacts.find((a) => a.id === artifactId);
    if (artifact) {
      artifact.collected = false;
      savePageState(pageState);
    }
  }
}

/**
 * Mark all artifacts as returned (uncollected) on a specific page
 */
export function markAllArtifactsReturnedOnPage(pageUrl: string): void {
  const pageState = getPageState(pageUrl);
  if (pageState) {
    pageState.artifacts.forEach((artifact) => {
      artifact.collected = false;
    });
    savePageState(pageState);
  }
}

/**
 * Get stored inventory
 */
export function getStoredInventory(): StoredInventoryItem[] {
  const state = getGameState();
  return state.inventory;
}

/**
 * Save inventory item
 */
export function addInventoryItem(item: StoredInventoryItem): void {
  const state = getGameState();
  state.inventory.push(item);
  saveGameState(state);
}

/**
 * Remove inventory item
 */
export function removeInventoryItem(itemId: string): void {
  const state = getGameState();
  state.inventory = state.inventory.filter((item) => item.id !== itemId);
  saveGameState(state);
}

/**
 * Clear all inventory
 */
export function clearInventory(): void {
  const state = getGameState();
  state.inventory = [];
  saveGameState(state);
}

/**
 * Add travel history entry
 */
export function addTravelHistory(entry: TravelHistoryEntry): void {
  const state = getGameState();
  state.travelHistory.push(entry);
  // Keep only last 50 entries
  if (state.travelHistory.length > 50) {
    state.travelHistory = state.travelHistory.slice(-50);
  }
  saveGameState(state);
}

/**
 * Get the previous page URL (for "go back" functionality)
 */
export function getPreviousPageUrl(): string | undefined {
  const state = getGameState();
  return state.previousPageUrl;
}

/**
 * Set the previous page URL before traveling
 */
export function setPreviousPageUrl(url: string): void {
  const state = getGameState();
  state.previousPageUrl = url;
  saveGameState(state);
}

/**
 * Check if we arrived via portal travel
 */
export function hasArrivedViaPortal(): boolean {
  const state = getGameState();
  return !!state.previousPageUrl;
}

/**
 * Clear the arrival flag (after showing welcome message)
 */
export function clearArrivalFlag(): void {
  const state = getGameState();
  state.previousPageUrl = undefined;
  saveGameState(state);
}

/**
 * Check if current page has been visited before
 */
export function hasVisitedCurrentPage(): boolean {
  return getPageState() !== null;
}

// --- Visited Realms ---

/**
 * Add or update a visited realm
 */
export function addVisitedRealm(url: string, title: string, icon: string = "🏰"): void {
  const state = getGameState();
  if (!state.visitedRealms) {
    state.visitedRealms = [];
  }
  
  const existingIndex = state.visitedRealms.findIndex((r) => r.url === url);
  const now = Date.now();
  
  if (existingIndex !== -1) {
    // Update existing realm
    state.visitedRealms[existingIndex].lastVisited = now;
    state.visitedRealms[existingIndex].title = title;
  } else {
    // Add new realm
    state.visitedRealms.push({
      url,
      title,
      icon,
      firstVisited: now,
      lastVisited: now,
    });
  }
  
  saveGameState(state);
}

/**
 * Get all visited realms
 */
export function getVisitedRealms(): VisitedRealm[] {
  const state = getGameState();
  return state.visitedRealms || [];
}

/**
 * Check if a realm has been visited
 */
export function hasVisitedRealm(url: string): boolean {
  const realms = getVisitedRealms();
  return realms.some((r) => r.url === url);
}

/**
 * Clear all visited realms except the first one (by firstVisited timestamp)
 */
export function clearVisitedRealmsExceptFirst(): void {
  const state = getGameState();
  if (!state.visitedRealms || state.visitedRealms.length <= 1) {
    return;
  }
  
  // Sort by firstVisited to find the oldest (first) realm
  const sorted = [...state.visitedRealms].sort((a, b) => a.firstVisited - b.firstVisited);
  
  // Keep only the first realm
  state.visitedRealms = [sorted[0]];
  
  saveGameState(state);
}

/**
 * Get the current realm URL (normalized)
 */
export function getCurrentRealmUrl(): string {
  return getCurrentPageUrl();
}

/**
 * Get the current realm title
 */
export function getCurrentRealmTitle(): string {
  return getCurrentPageTitle();
}

/**
 * Clear all stored game state
 */
export function clearAllGameState(): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (e) {
    console.warn("Failed to clear game state:", e);
  }
}

/**
 * Check if persistence is available
 */
export function isPersistenceAvailable(): boolean {
  try {
    const testKey = "__at_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

