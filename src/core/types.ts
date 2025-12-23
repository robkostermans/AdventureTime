// Global type definitions for AdventureTime

export interface AppConfig {
  debug: boolean;
  viewport: ViewportConfig;
  avatar: AvatarConfig;
  world: WorldConfig;
  movement: MovementConfig;
  interaction: InteractionConfig;
  inventory: InventoryConfig;
}

export interface ViewportConfig {
  size: number; // Square viewport size (default 400)
}

export interface AvatarConfig {
  size: number; // Avatar size in pixels
  color: string; // Avatar color
  shape: "circle" | "square"; // Avatar shape
  // Movement feedback settings
  maxOffset: number; // Maximum offset from center when moving (pixels)
  offsetSmoothing: number; // How quickly avatar returns to center (0-1, lower = smoother)
  rotationEnabled: boolean; // Whether avatar rotates in movement direction
}

export interface WorldConfig {
  backgroundColor: string; // Extended border background color
}

export interface MovementConfig {
  speed: number; // Base movement speed in pixels per frame
}

export interface InteractionConfig {
  enabled: boolean; // Whether interaction layer is enabled
  backgroundColor: string; // Semi-transparent background for dev visibility
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
