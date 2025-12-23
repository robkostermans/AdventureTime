// Input handler feature implementation

import { normalizeVector } from "../../core/utils";
import type { CleanupFunction, Vector2D } from "../../core/types";
import type {
  InputFeatureConfig,
  InputState,
  InputCallback,
  AvatarDirectionCallback,
  MovementStopCallback,
} from "./types";

let isInitialized = false;
let config: InputFeatureConfig;
let inputState: InputState = { up: false, down: false, left: false, right: false };
let previouslyMoving = false;
let isPaused = false;
let animationFrameId: number | null = null;
let movementCallback: InputCallback | null = null;
let avatarDirectionCallback: AvatarDirectionCallback | null = null;
let movementStopCallback: MovementStopCallback | null = null;
let cleanupFunctions: CleanupFunction[] = [];

export function initInput(featureConfig: InputFeatureConfig): void {
  if (isInitialized) {
    console.warn("Input already initialized");
    return;
  }

  config = { enabled: true, debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  // Reset state
  previouslyMoving = false;

  // Set up keyboard event listeners
  setupKeyboardListeners();

  // Start the game loop
  startGameLoop();

  isInitialized = true;

  if (config.debug) {
    console.log("Input initialized", config);
  }
}

export function destroyInput(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  inputState = { up: false, down: false, left: false, right: false };
  previouslyMoving = false;
  movementCallback = null;
  avatarDirectionCallback = null;
  movementStopCallback = null;
  isInitialized = false;
}

export function setMovementCallback(callback: InputCallback): void {
  movementCallback = callback;
}

export function setAvatarDirectionCallback(callback: AvatarDirectionCallback): void {
  avatarDirectionCallback = callback;
}

export function setMovementStopCallback(callback: MovementStopCallback): void {
  movementStopCallback = callback;
}

export function getInputState(): InputState {
  return { ...inputState };
}

export function setSpeed(speed: number): void {
  config.speed = speed;
}

export function getSpeed(): number {
  return config.speed;
}

/**
 * Pauses input processing (movement keys are ignored)
 */
export function pauseInput(): void {
  if (!isPaused) {
    isPaused = true;
    // Reset input state and trigger stop callback
    inputState = { up: false, down: false, left: false, right: false };
    if (previouslyMoving && movementStopCallback) {
      movementStopCallback();
    }
    previouslyMoving = false;
  }
}

/**
 * Resumes input processing
 */
export function resumeInput(): void {
  isPaused = false;
}

/**
 * Returns whether input is currently paused
 */
export function isInputPaused(): boolean {
  return isPaused;
}

function setupKeyboardListeners(): void {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Skip movement keys when paused
    if (isPaused) {
      return;
    }

    // Prevent default for arrow keys to avoid page scrolling
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case "ArrowUp":
      case "w":
      case "W":
        inputState.up = true;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        inputState.down = true;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        inputState.left = true;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        inputState.right = true;
        break;
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowUp":
      case "w":
      case "W":
        inputState.up = false;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        inputState.down = false;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        inputState.left = false;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        inputState.right = false;
        break;
    }
  };

  // Handle window blur to reset input state
  const handleBlur = () => {
    inputState = { up: false, down: false, left: false, right: false };
  };

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleBlur);

  cleanupFunctions.push(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", handleBlur);
  });
}

function startGameLoop(): void {
  const gameLoop = () => {
    processInput();
    animationFrameId = requestAnimationFrame(gameLoop);
  };

  animationFrameId = requestAnimationFrame(gameLoop);
}

function processInput(): void {
  // Calculate raw direction vector
  let dirX = 0;
  let dirY = 0;

  if (inputState.left) dirX -= 1;
  if (inputState.right) dirX += 1;
  if (inputState.up) dirY -= 1;
  if (inputState.down) dirY += 1;

  const isMoving = dirX !== 0 || dirY !== 0;

  // Handle movement stop
  if (!isMoving && previouslyMoving) {
    if (movementStopCallback) {
      movementStopCallback();
    }
    previouslyMoving = false;
    return;
  }

  // Skip if no movement
  if (!isMoving) {
    return;
  }

  previouslyMoving = true;

  // Normalize for diagonal movement compensation
  const direction = normalizeVector({ x: dirX, y: dirY });

  // Update avatar direction (non-inverted, for rotation/offset)
  if (avatarDirectionCallback) {
    avatarDirectionCallback(direction);
  }

  // Apply speed and INVERT direction for world movement (world moves opposite to input)
  if (movementCallback) {
    const movement: Vector2D = {
      x: -direction.x * config.speed,
      y: -direction.y * config.speed,
    };
    movementCallback(movement);
  }
}
