// Feature aggregation and initialization

import {
  initViewport,
  destroyViewport,
  setCloseCallback,
  fadeFromBlack,
} from "./viewport";
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
  recalculateWorldBounds,
} from "./world";
import {
  initInteraction,
  destroyInteraction,
  getArtifacts,
  removeArtifact,
  updateArtifactViewportStates,
} from "./interaction";
import { initDesignLayer, destroyDesignLayer } from "./design";
import {
  initInventory,
  destroyInventory,
  enableCollisionDetection,
} from "./inventory";
import {
  initNavigation,
  destroyNavigation,
  setNavigationMoving,
} from "./navigation";
import {
  initStoryMode,
  destroyStoryMode,
  showArrivalStoryMode,
} from "./storymode";
import {
  initInput,
  destroyInput,
  setMovementCallback,
  setAvatarDirectionCallback,
  setMovementStopCallback,
} from "./input";
import {
  initPersistence,
  destroyPersistence,
  hasArrivedViaPortal,
  getPreviousPageUrl,
  clearArrivalFlag,
} from "./persistence";
import { initTravel, destroyTravel } from "./travel";
import type { AppConfig, CleanupFunction } from "../core/types";
import { debounce } from "../core/utils";

export async function initFeatures(
  config: AppConfig
): Promise<CleanupFunction> {
  const cleanupFunctions: CleanupFunction[] = [];

  try {
    // Initialize persistence first (loads saved state)
    initPersistence({
      enabled: true,
      debug: config.debug,
    });
    cleanupFunctions.push(destroyPersistence);

    // Initialize travel feature
    initTravel({
      enabled: true,
      debug: config.debug,
    });
    cleanupFunctions.push(destroyTravel);

    // Check if we arrived via portal (for showing arrival message later)
    const arrivedViaPortal = hasArrivedViaPortal();
    const previousPageUrl = arrivedViaPortal ? getPreviousPageUrl() : undefined;

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
            backgroundColor: config.design.backgroundColor,
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
    }

    // Initialize viewport (creates the viewing window)
    // Must be initialized before inventory so inventory can append to viewport container
    initViewport({
      enabled: true,
      debug: config.debug,
      sizePercent: config.viewport.sizePercent,
      mobileBreakpoint: config.viewport.mobileBreakpoint,
    });
    cleanupFunctions.push(destroyViewport);

    // Set up close button callback to destroy the app
    setCloseCallback(() => {
      if (config.debug) {
        console.log("AdventureTime closing...");
      }
      destroyFeatures();
    });

    // Initialize inventory system (depends on interaction layer AND viewport)
    if (config.interaction.enabled && config.inventory.enabled) {
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

    // Enable collision detection AFTER all features are initialized
    // This prevents false collisions during initialization/resizing
    if (config.inventory.enabled) {
      enableCollisionDetection();
    }

    // If we arrived via portal, show arrival message and fade in
    if (arrivedViaPortal) {
      // Get region name from page title
      const regionName = document.title || window.location.pathname;

      // Fade in from black (we should already be faded to black from the travel)
      fadeFromBlack().then(() => {
        // Show arrival story mode after fade completes
        if (config.storyMode?.enabled) {
          showArrivalStoryMode(regionName, previousPageUrl);
        }
        // Clear the arrival flag so it doesn't show again on refresh
        clearArrivalFlag();
      });
    }

    // Setup window resize handler to recalculate all layers
    const handleResize = debounce(() => {
      // Recalculate world bounds
      recalculateWorldBounds();

      // Update artifact viewport states
      if (config.interaction.enabled) {
        updateArtifactViewportStates();
      }

      if (config.debug) {
        console.log("Window resized - layers recalculated");
      }
    }, 100);

    window.addEventListener("resize", handleResize);
    cleanupFunctions.push(() => {
      window.removeEventListener("resize", handleResize);
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
