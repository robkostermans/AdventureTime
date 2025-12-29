// Travel feature implementation - handles portal travel between pages

import type { TravelFeatureConfig, TravelDestination } from "./types";
import { fadeToBlack } from "../viewport";
import {
  setPreviousPageUrl,
  addTravelHistory,
  getPreviousPageUrl,
} from "../persistence";

let isInitialized = false;
let config: TravelFeatureConfig;

/**
 * Get the current page URL (normalized)
 */
function getCurrentPageUrl(): string {
  return window.location.pathname + window.location.search;
}

/**
 * Get the current page title
 */
function getCurrentPageTitle(): string {
  return document.title || window.location.pathname;
}

/**
 * Check if a URL is within the same subdomain/origin
 */
export function isSameOrigin(url: string): boolean {
  try {
    const targetUrl = new URL(url, window.location.href);
    return targetUrl.origin === window.location.origin;
  } catch {
    // Relative URLs are always same origin
    return true;
  }
}

/**
 * Initialize travel feature
 */
export function initTravel(featureConfig: TravelFeatureConfig): void {
  if (isInitialized) {
    console.warn("Travel already initialized");
    return;
  }

  config = { debug: false, fadeDuration: 500, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  isInitialized = true;

  if (config.debug) {
    console.log("Travel initialized", config);
  }
}

/**
 * Destroy travel feature
 */
export function destroyTravel(): void {
  isInitialized = false;
}

/**
 * Travel to a destination via portal
 * This handles the fade transition and navigation
 */
export async function travelToDestination(destination: TravelDestination): Promise<void> {
  if (!isSameOrigin(destination.url)) {
    // External link - just navigate directly
    window.location.href = destination.url;
    return;
  }

  // Store current page as previous for "go back" functionality
  const currentUrl = getCurrentPageUrl();
  const currentTitle = getCurrentPageTitle();

  // Save to persistence
  setPreviousPageUrl(currentUrl);
  addTravelHistory({
    url: currentUrl,
    title: currentTitle,
    timestamp: Date.now(),
  });

  if (config.debug) {
    console.log(`Traveling from ${currentUrl} to ${destination.url}`);
  }

  // Fade to black
  await fadeToBlack();

  // Small delay for visual effect
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Navigate to the new page
  window.location.href = destination.url;
}

/**
 * Travel back to the previous page
 */
export async function travelBack(): Promise<void> {
  const previousUrl = getPreviousPageUrl();

  if (!previousUrl) {
    if (config.debug) {
      console.log("No previous page to travel back to");
    }
    return;
  }

  // Store current page as previous (for potential return)
  const currentUrl = getCurrentPageUrl();
  const currentTitle = getCurrentPageTitle();

  setPreviousPageUrl(currentUrl);
  addTravelHistory({
    url: currentUrl,
    title: currentTitle,
    timestamp: Date.now(),
  });

  if (config.debug) {
    console.log(`Traveling back to ${previousUrl}`);
  }

  // Fade to black
  await fadeToBlack();

  // Small delay for visual effect
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Navigate back
  window.location.href = previousUrl;
}

/**
 * Check if travel back is available
 */
export function canTravelBack(): boolean {
  return !!getPreviousPageUrl();
}

/**
 * Get the previous page URL for display
 */
export function getPreviousPageUrlForDisplay(): string | undefined {
  return getPreviousPageUrl();
}

