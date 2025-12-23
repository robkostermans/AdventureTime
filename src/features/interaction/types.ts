// Interaction layer feature types

import type { FeatureConfig } from "../../core/types";

export interface InteractionFeatureConfig extends FeatureConfig {
  backgroundColor: string; // Semi-transparent background color for dev visibility
}

/**
 * Artifact types that can be detected from DOM elements
 */
export type ArtifactType = 
  | "portal"    // Links (<a>)
  | "paper"     // Paragraphs (<p>)
  | "direction" // Headers (<h1>-<h6>)
  | "diamond"   // Images (<img>)
  | "silver"    // Tags (.tag)
  | "gold";     // Cards (.card)

/**
 * Priority order for artifact detection (higher = checked first)
 * Complex structures take precedence over simple elements
 */
export const ARTIFACT_PRIORITY: Record<ArtifactType, number> = {
  gold: 100,      // Cards - highest priority
  silver: 90,     // Tags
  portal: 50,     // Links
  direction: 40,  // Headers
  paper: 30,      // Paragraphs
  diamond: 20,    // Images - lowest priority
};

/**
 * Represents a detected artifact from the DOM
 */
export interface Artifact {
  id: string;
  type: ArtifactType;
  sourceElement: HTMLElement;
  iconElement: HTMLDivElement;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

/**
 * Icon definitions for each artifact type
 */
export const ARTIFACT_ICONS: Record<ArtifactType, string> = {
  portal: "🌀",    // Portal for links
  paper: "📜",     // Paper scroll for paragraphs
  direction: "🪧", // Sign for headers
  diamond: "💎",   // Diamond for images
  silver: "🪙",    // Silver coin for tags
  gold: "🥇",      // Gold coin for cards
};

/**
 * CSS selectors for detecting each artifact type
 */
export const ARTIFACT_SELECTORS: Record<ArtifactType, string> = {
  gold: ".card",
  silver: ".tag",
  portal: "a[href]",
  direction: "h1, h2, h3, h4, h5, h6",
  paper: "p",
  diamond: "img, .image-placeholder",
};

