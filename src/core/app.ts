// Main application functions

import { initFeatures, destroyFeatures } from "../features";
import type { AppConfig, CleanupFunction } from "./types";
import { setIconTheme } from "./icons";

let isInitialized = false;
let cleanupFunctions: CleanupFunction[] = [];

export async function initApp(config: AppConfig): Promise<void> {
  if (isInitialized) {
    console.warn("AdventureTime already initialized");
    return;
  }

  try {
    // Set icon theme if provided
    if (config.icons) {
      setIconTheme(config.icons);
    }

    // Initialize all features
    const featureCleanup = await initFeatures(config);
    cleanupFunctions.push(featureCleanup);

    isInitialized = true;

    if (config.debug) {
      console.log("AdventureTime initialized", config);
    }
  } catch (error) {
    console.error("AdventureTime initialization failed:", error);
    throw error;
  }
}

export async function destroyApp(): Promise<void> {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  isInitialized = false;
}

