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
  navigation?: NavigationConfig; // Optional navigation indicator feature
  storyMode?: StoryModeConfig; // Optional story mode (terminal-style text interface)
}

export interface StoryModeConfig {
  enabled: boolean; // Whether story mode is enabled (replaces popover with terminal text)
  typewriterSpeed?: number; // Characters per second for typewriter effect (default: 50)
}

export interface DesignConfig {
  enabled: boolean; // Whether design layer is enabled
  backgroundColor: string; // Base background color for the layer
}

export interface ViewportConfig {
  maxWidth: number; // Maximum viewport width (default 390 - iPhone 14 width)
  maxHeight: number; // Maximum viewport height (default 844 - iPhone 14 height)
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
  abyssBackgroundColor?: string; // Background color of the abyss (default: #000)
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
  // Intro configuration for the first direction artifact
  intro?: IntroConfig;
}

export interface IntroConfig {
  enabled: boolean; // Whether to show intro on first direction artifact
  icon?: string; // Custom icon for intro (default: 🎪)
  title?: string; // Custom title (default: "Welcome!")
  text: string; // Intro text to display in the popover
}

export interface InventoryConfig {
  enabled: boolean; // Whether inventory system is enabled
  collisionRadius: number; // Extra collision radius around avatar
}

export interface NavigationConfig {
  enabled: boolean; // Whether navigation indicator is enabled
  indicatorDistance: number; // Distance from avatar center to indicator (in pixels)
  // Show indicator only when standing still (inverted behavior)
  // Default: false (show when moving, hide when still)
  showWhenStill?: boolean;
  // Optional visual properties (CSS defaults used if not provided)
  indicatorSize?: number; // Size of the indicator dot (default: 8px)
  indicatorColor?: string; // Color of the indicator (default: #FFD700 gold)
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
