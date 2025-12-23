// Avatar feature types

import type { FeatureConfig, Vector2D } from "../../core/types";

export interface AvatarFeatureConfig extends FeatureConfig {
  size: number; // Avatar size in pixels (required for collision detection)
  viewportSize: number; // Parent viewport size (to center avatar)
  // Movement feedback settings
  maxOffset: number; // Maximum offset from center when moving (pixels)
  offsetSmoothing: number; // How quickly avatar returns to center (0-1, lower = smoother)
  rotationEnabled: boolean; // Whether avatar rotates in movement direction
  // Optional visual properties (CSS defaults used if not provided)
  color?: string; // Avatar color (default: #4CAF50)
  shape?: "circle" | "square"; // Avatar shape (default: circle)
}

export interface AvatarState {
  offset: Vector2D; // Current offset from center
  rotation: number; // Current rotation in degrees
  targetOffset: Vector2D; // Target offset based on movement
  targetRotation: number; // Target rotation based on movement direction
}
