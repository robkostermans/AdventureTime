// Icon system types

/**
 * All icon names used in the application
 */
export type IconName =
  // Artifact icons
  | "portal" // Links - swirling portal
  | "paper" // Paragraphs - scroll
  | "direction" // Headers - signpost
  | "diamond" // Images - gem
  | "silver" // Tags - coin
  | "gold" // Cards - treasure chest
  // Special artifact icons
  | "intro" // Starting point - tent/camp
  | "dimensional" // External portal - galaxy
  | "ghost" // Collected artifact marker - star
  // UI icons
  | "inventory" // Bag/backpack
  | "realms" // Map
  | "close" // X button
  | "arrow" // Selection arrow
  | "navigation" // Direction indicator dot
  | "pulse" // Click indicator
  // Avatar
  | "avatar"; // Player character

/**
 * Icon theme configuration
 */
export interface IconTheme {
  // Primary colors
  strokeColor: string; // Main stroke/line color
  fillColor: string; // Fill color (often "none" for outline style)
  accentColor: string; // Accent/highlight color
  // Artifact-specific colors (optional overrides)
  portalColor?: string;
  paperColor?: string;
  directionColor?: string;
  diamondColor?: string;
  silverColor?: string;
  goldColor?: string;
  introColor?: string;
  dimensionalColor?: string;
  ghostColor?: string;
  // UI-specific colors
  uiStrokeColor?: string;
  uiAccentColor?: string;
  // Avatar color
  avatarColor?: string;
}

/**
 * Default icon theme - warm adventure palette
 */
export const DEFAULT_ICON_THEME: IconTheme = {
  strokeColor: "#2c1810", // Dark brown
  fillColor: "none",
  accentColor: "#d4a574", // Warm tan
  // Artifact colors
  portalColor: "#7b68ee", // Medium slate blue
  paperColor: "#deb887", // Burlywood
  directionColor: "#8b4513", // Saddle brown
  diamondColor: "#40e0d0", // Turquoise
  silverColor: "#c0c0c0", // Silver
  goldColor: "#ffd700", // Gold
  introColor: "#e74c3c", // Red tent
  dimensionalColor: "#9b59b6", // Purple galaxy
  ghostColor: "#f1c40f", // Yellow star
  // UI colors
  uiStrokeColor: "#3a2a1a",
  uiAccentColor: "#d4a574",
  // Avatar
  avatarColor: "#4CAF50", // Green explorer
};

