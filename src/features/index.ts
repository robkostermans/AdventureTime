// Feature aggregation and initialization

import { initViewport, destroyViewport } from "./viewport";
import {
  initAvatar,
  destroyAvatar,
  updateAvatarMovement,
  stopAvatarMovement,
} from "./avatar";
import {
  initWorld,
  destroyWorld,
  moveWorld,
  getWorldContainer,
  setWorldPosition,
} from "./world";
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
  initNavigation,
  destroyNavigation,
  setNavigationMoving,
} from "./navigation";
import { initStoryMode, destroyStoryMode } from "./storymode";
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
          intro: config.interaction.intro,
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

      // Initialize story mode (before inventory, as inventory depends on it)
      if (config.storyMode?.enabled) {
        initStoryMode({
          enabled: true,
          debug: config.debug,
          typewriterSpeed: config.storyMode.typewriterSpeed ?? 50,
        });
        cleanupFunctions.push(destroyStoryMode);
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
      maxWidth: config.viewport.maxWidth,
      maxHeight: config.viewport.maxHeight,
    });
    cleanupFunctions.push(destroyViewport);

    // Set starting position: center on first direction artifact, or page center
    if (config.interaction.enabled) {
      setStartingPosition();
    }

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
      maxOffset: config.avatar.maxOffset,
      offsetSmoothing: config.avatar.offsetSmoothing,
      rotationEnabled: config.avatar.rotationEnabled,
    });
    cleanupFunctions.push(destroyAvatar);

    // Initialize navigation indicator (points to nearest direction artifact)
    if (config.navigation?.enabled && config.interaction.enabled) {
      initNavigation(
        {
          enabled: true,
          debug: config.debug,
          indicatorDistance: config.navigation.indicatorDistance,
          showWhenStill: config.navigation.showWhenStill,
          indicatorSize: config.navigation.indicatorSize,
          indicatorColor: config.navigation.indicatorColor,
        },
        getArtifacts
      );
      cleanupFunctions.push(destroyNavigation);
    }

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
      // Notify navigation that we're moving
      if (config.navigation?.enabled) {
        setNavigationMoving(true);
      }
    });

    // Connect movement stop to avatar return-to-center
    setMovementStopCallback(() => {
      stopAvatarMovement();
      // Notify navigation that we've stopped
      if (config.navigation?.enabled) {
        setNavigationMoving(false);
      }
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
  destroyNavigation();
  destroyInventory();
  destroyStoryMode();
  destroyDesignLayer();
  destroyAvatar();
  destroyViewport();
  destroyInteraction();
  destroyWorld();
}

/**
 * Sets the starting position of the world.
 * Centers on the first direction artifact's icon if available, otherwise centers on the page.
 * Note: Artifacts are positioned randomly within their source element, so we use the
 * icon element's position (not the source element) to ensure the artifact is in view.
 */
function setStartingPosition(): void {
  const artifacts = getArtifacts();
  const directionArtifacts = artifacts.filter((a) => a.type === "direction");

  // Screen center (where avatar appears)
  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;

  if (directionArtifacts.length > 0) {
    // Sort by source element's document position (top to bottom, left to right) to get the "first" one
    // We sort by source element position to maintain logical order (first heading on page)
    directionArtifacts.sort((a, b) => {
      const posA = a.sourceElement.getBoundingClientRect();
      const posB = b.sourceElement.getBoundingClientRect();
      // Sort by Y first, then X
      if (Math.abs(posA.top - posB.top) > 50) {
        return posA.top - posB.top;
      }
      return posA.left - posB.left;
    });

    const firstDirection = directionArtifacts[0];

    // Use the icon element's position (which is randomly placed within the source element)
    // This ensures the actual artifact icon is centered in the viewport
    const iconRect = firstDirection.iconElement.getBoundingClientRect();

    // Calculate world offset to center this artifact icon in the viewport
    const artifactCenterX = iconRect.left + iconRect.width / 2;
    const artifactCenterY = iconRect.top + iconRect.height / 2;

    // World position is the negative offset needed to bring artifact to center
    const worldX = screenCenterX - artifactCenterX;
    const worldY = screenCenterY - artifactCenterY;

    setWorldPosition({ x: worldX, y: worldY });
  } else {
    // No direction artifacts - center on page
    // Calculate offset to center the page content
    const pageWidth = Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      window.innerWidth
    );
    const pageHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight
    );

    // Center the page in the viewport
    const worldX = screenCenterX - pageWidth / 2;
    const worldY = screenCenterY - pageHeight / 2;

    setWorldPosition({ x: worldX, y: worldY });
  }
}

// Re-export features for direct access if needed
export * from "./viewport";
export * from "./avatar";
export * from "./world";
export * from "./input";
export * from "./interaction";
export * from "./design";
export * from "./inventory";
export * from "./navigation";
export * from "./storymode";
