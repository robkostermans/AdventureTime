// Inventory feature types

import type { FeatureConfig } from "../../core/types";
import type { Artifact, ArtifactType } from "../interaction/types";

export interface InventoryFeatureConfig extends FeatureConfig {
  avatarSize: number; // Avatar size for collision detection
  collisionRadius: number; // Extra radius around avatar for collision
}

/**
 * An item collected in the inventory
 */
export interface InventoryItem {
  id: string;
  artifact: Artifact;
  collectedAt: number; // Timestamp
  originalContent: string; // HTML content of the source element
  originalHref?: string; // For portals, the link URL
}

/**
 * Inventory state
 */
export interface InventoryState {
  items: InventoryItem[];
  isOpen: boolean;
  expandedItemId: string | null;
}

/**
 * Callback when an artifact is collected
 */
export type ArtifactCollectedCallback = (item: InventoryItem) => void;

/**
 * Callback when collision occurs with an artifact
 */
export type ArtifactCollisionCallback = (artifact: Artifact) => void;

/**
 * Labels for artifact types in the UI
 */
export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  portal: "Portal",
  paper: "Scroll",
  direction: "Sign",
  diamond: "Gem",
  silver: "Silver Coin",
  gold: "Gold Coin",
};

/**
 * Action labels for artifact types
 */
export const ARTIFACT_ACTION_LABELS: Record<ArtifactType, string | null> = {
  portal: "Travel",
  paper: "Take",
  direction: null, // Direction artifacts have no action, only "Leave"
  diamond: "Take",
  silver: "Take",
  gold: "Take",
};

