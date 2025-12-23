// Global type definitions for AdventureTime

export interface AppConfig {
  debug: boolean;
  viewport: ViewportConfig;
  avatar: AvatarConfig;
  world: WorldConfig;
  movement: MovementConfig;
  interaction: InteractionConfig;
  inventory: InventoryConfig;
  design: DesignConfig;
}

export interface DesignConfig {
  enabled: boolean; // Whether design layer is enabled
}

export interface ViewportConfig {
  size: number; // Square viewport size (default 400)
}

export interface AvatarConfig {
  size: number; // Avatar size in pixels (required for collision detection)
  // Movement feedback settings
  maxOffset: number; // Maximum offset from center when moving (pixels)
  offsetSmoothing: number; // How quickly avatar returns to center (0-1, lower = smoother)
  rotationEnabled: boolean; // Whether avatar rotates in movement direction
  // Optional visual properties (CSS defaults used if not provided)
  color?: string; // Avatar color (default: #4CAF50)
  shape?: "circle" | "square"; // Avatar shape (default: circle)
}

export interface WorldConfig {
  // Optional visual properties (CSS defaults used if not provided)
  backgroundColor?: string; // Extended border background color (default: #1a1a2e)
}

export interface MovementConfig {
  speed: number; // Maximum movement speed in pixels per frame
  acceleration: number; // How quickly to reach max speed (0-1, higher = faster)
  deceleration: number; // How quickly to slow down when stopping (0-1, higher = faster)
}

export interface InteractionConfig {
  enabled: boolean; // Whether interaction layer is enabled
  // Optional visual properties (CSS defaults used if not provided)
  backgroundColor?: string; // Semi-transparent background for dev visibility (default: transparent)
}

export interface InventoryConfig {
  enabled: boolean; // Whether inventory system is enabled
  collisionRadius: number; // Extra collision radius around avatar
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface FeatureConfig {
  enabled: boolean;
  debug?: boolean;
}

export type CleanupFunction = () => void;
