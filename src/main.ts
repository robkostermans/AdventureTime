// AdventureTime - Main Entry Point
// A top-down browser game that transforms webpages into explorable worlds

import { initApp, destroyApp } from "./core";
import type { AppConfig } from "./core/types";

// IIFE wrapper for bookmarklet compatibility
(function () {
  "use strict";

  // Prevent multiple executions
  if ((window as any).__ADVENTURE_TIME_LOADED__) {
    console.warn(
      "AdventureTime already loaded. Destroying previous instance..."
    );
    if ((window as any).AdventureTimeAPI?.destroy) {
      (window as any).AdventureTimeAPI.destroy();
    }
  }
  (window as any).__ADVENTURE_TIME_LOADED__ = true;

  // Application configuration
  const config: AppConfig = {
    debug: true, // Set to false for production
    viewport: {
      size: 400, // 400x400 pixel viewport
    },
    avatar: {
      size: 32, // 32px avatar
      color: "#4CAF50", // Green avatar
      shape: "circle", // Circle shape
      // Movement feedback settings
      maxOffset: 8, // Avatar moves up to 8px from center while moving
      offsetSmoothing: 0.12, // Smooth return to center (lower = smoother)
      rotationEnabled: true, // Avatar rotates to face movement direction
    },
    world: {
      backgroundColor: "#1a1a2e", // Dark background for extended borders
    },
    movement: {
      speed: 5, // 5 pixels per frame
    },
    interaction: {
      enabled: true, // Enable interaction layer
      backgroundColor: "rgba(0, 0, 50, 0.1)", // Slight blue tint for dev visibility
    },
    inventory: {
      enabled: true, // Enable inventory system
      collisionRadius: 10, // Extra collision radius around avatar
    },
  };

  // Initialize and start application
  async function startApp() {
    try {
      await initApp(config);
      console.log("🎮 AdventureTime started! Use arrow keys or WASD to move.");
    } catch (error) {
      console.error("Failed to start AdventureTime:", error);
    }
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    startApp();
  }

  // Expose global API
  (window as any).AdventureTimeAPI = {
    version: "1.0.0",
    destroy: async () => {
      await destroyApp();
      delete (window as any).__ADVENTURE_TIME_LOADED__;
      delete (window as any).AdventureTimeAPI;
      console.log("🎮 AdventureTime destroyed.");
    },
  };
})();
