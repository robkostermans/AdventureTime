// Persistence feature types

import type { FeatureConfig, Vector2D } from "../../core/types";
import type { ArtifactType } from "../interaction/types";

export interface PersistenceFeatureConfig extends FeatureConfig {
  storagePrefix?: string; // Prefix for localStorage keys (default: "at")
}

/**
 * Stored artifact position for a specific page
 */
export interface StoredArtifactPosition {
  id: string;
  type: ArtifactType;
  position: Vector2D;
  collected: boolean;
}

/**
 * Stored page state (artifact positions, etc.)
 */
export interface StoredPageState {
  url: string;
  artifacts: StoredArtifactPosition[];
  lastVisited: number;
}

/**
 * Stored inventory item
 */
export interface StoredInventoryItem {
  id: string;
  type: ArtifactType;
  content: string;
  href?: string;
  collectedAt: number;
  collectedFromUrl: string;
}

/**
 * Travel history entry
 */
export interface TravelHistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

/**
 * Visited realm entry
 */
export interface VisitedRealm {
  url: string;
  title: string;
  icon: string; // Emoji icon for the realm
  firstVisited: number;
  lastVisited: number;
}

/**
 * Complete stored game state
 */
export interface StoredGameState {
  inventory: StoredInventoryItem[];
  pages: Record<string, StoredPageState>;
  travelHistory: TravelHistoryEntry[];
  visitedRealms: VisitedRealm[];
  currentPageUrl: string;
  previousPageUrl?: string;
}

