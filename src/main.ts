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
  // Visual styling (colors, shapes) is defined in CSS files - see src/features/*/[feature].css
  // Only behavioral/functional settings are configured here
  const config: AppConfig = {
    debug: true, // Set to false for production
    viewport: {
      size: 400, // 400x400 pixel viewport
    },
    avatar: {
      size: 32, // 32px avatar (used for collision detection)
      // Movement feedback settings
      maxOffset: 32, // Avatar moves up to 32px from center at full speed
      offsetSmoothing: 0.12, // Smooth return to center (lower = smoother)
      rotationEnabled: true, // Avatar rotates to face movement direction
      // Optional: override CSS defaults for visual customization
      // color: "#4CAF50",
      // shape: "circle",
    },
    world: {
      // Optional: override CSS defaults for visual customization
      // backgroundColor: "#1a1a2e",
    },
    movement: {
      speed: 5, // Maximum speed in pixels per frame
      acceleration: 0.15, // How quickly to reach max speed (0-1)
      deceleration: 0.12, // How quickly to slow down (0-1)
    },
    interaction: {
      enabled: true, // Enable interaction layer
      // Optional: override CSS defaults for visual customization
      // backgroundColor: "rgba(0, 0, 50, 0.1)",
    },
    inventory: {
      enabled: true, // Enable inventory system
      collisionRadius: 10, // Extra collision radius around avatar
    },
    design: {
      enabled: true, // Enable design layer with decorative blobs
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
