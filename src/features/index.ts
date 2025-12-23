// Feature aggregation and initialization

import { initViewport, destroyViewport } from "./viewport";
import {
  initAvatar,
  destroyAvatar,
  updateAvatarMovement,
  stopAvatarMovement,
} from "./avatar";
import { initWorld, destroyWorld, moveWorld, getWorldContainer } from "./world";
import {
  initInteraction,
  destroyInteraction,
  getArtifacts,
  removeArtifact,
  updateArtifactViewportStates,
} from "./interaction";
import { initDesignLayer, destroyDesignLayer } from "./design";
import { initInventory, destroyInventory } from "./inventory";
import {
  initInput,
  destroyInput,
  setMovementCallback,
  setAvatarDirectionCallback,
  setMovementStopCallback,
} from "./input";
import type { AppConfig, CleanupFunction } from "../core/types";

export async function initFeatures(
  config: AppConfig
): Promise<CleanupFunction> {
  const cleanupFunctions: CleanupFunction[] = [];

  try {
    // Initialize world first (wraps page content)
    initWorld({
      enabled: true,
      debug: config.debug,
      viewportSize: config.viewport.size,
      backgroundColor: config.world.backgroundColor,
    });
    cleanupFunctions.push(destroyWorld);

    // Initialize interaction layer (between world content and viewport)
    // Must be initialized after world so we can scan for artifacts
    const worldContainer = getWorldContainer();
    if (worldContainer && config.interaction.enabled) {
      initInteraction(
        {
          enabled: true,
          debug: config.debug,
          backgroundColor: config.interaction.backgroundColor,
        },
        worldContainer
      );
      cleanupFunctions.push(destroyInteraction);

      // Initialize design layer (below interaction layer, decorative blobs)
      if (config.design.enabled) {
        initDesignLayer(
          {
            enabled: true,
            debug: config.debug,
            backgroundColor: "transparent",
          },
          worldContainer,
          getArtifacts
        );
        cleanupFunctions.push(destroyDesignLayer);
      }

      // Initialize inventory system (depends on interaction layer)
      if (config.inventory.enabled) {
        initInventory(
          {
            enabled: true,
            debug: config.debug,
            avatarSize: config.avatar.size,
            collisionRadius: config.inventory.collisionRadius,
          },
          getArtifacts,
          removeArtifact
        );
        cleanupFunctions.push(destroyInventory);
      }
    }

    // Initialize viewport (creates the viewing window)
    initViewport({
      enabled: true,
      debug: config.debug,
      size: config.viewport.size,
    });
    cleanupFunctions.push(destroyViewport);

    // Set initial artifact viewport states (after viewport is created)
    if (config.interaction.enabled) {
      updateArtifactViewportStates();
    }

    // Initialize avatar (centered in viewport)
    initAvatar({
      enabled: true,
      debug: config.debug,
      size: config.avatar.size,
      color: config.avatar.color,
      shape: config.avatar.shape,
      viewportSize: config.viewport.size,
      maxOffset: config.avatar.maxOffset,
      offsetSmoothing: config.avatar.offsetSmoothing,
      rotationEnabled: config.avatar.rotationEnabled,
    });
    cleanupFunctions.push(destroyAvatar);

    // Initialize input handler
    initInput({
      enabled: true,
      debug: config.debug,
      speed: config.movement.speed,
      acceleration: config.movement.acceleration,
      deceleration: config.movement.deceleration,
    });
    cleanupFunctions.push(destroyInput);

    // Connect input to world movement
    setMovementCallback((direction) => {
      moveWorld(direction);
    });

    // Connect input to avatar rotation/offset (with velocity factor for synced animations)
    setAvatarDirectionCallback((direction, velocityFactor) => {
      updateAvatarMovement(direction, velocityFactor);
    });

    // Connect movement stop to avatar return-to-center
    setMovementStopCallback(() => {
      stopAvatarMovement();
    });

    // Return cleanup function
    return () => {
      // Cleanup in reverse order
      cleanupFunctions.reverse().forEach((cleanup) => cleanup());
    };
  } catch (error) {
    // Cleanup any partially initialized features
    cleanupFunctions.reverse().forEach((cleanup) => cleanup());
    throw error;
  }
}

export function destroyFeatures(): void {
  destroyInput();
  destroyInventory();
  destroyDesignLayer();
  destroyAvatar();
  destroyViewport();
  destroyInteraction();
  destroyWorld();
}

// Re-export features for direct access if needed
export * from "./viewport";
export * from "./avatar";
export * from "./world";
export * from "./input";
export * from "./interaction";
export * from "./design";
export * from "./inventory";
