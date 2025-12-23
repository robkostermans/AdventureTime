// Design layer feature types

import type { FeatureConfig } from "../../core/types";
import type { ArtifactType } from "../interaction/types";

export interface DesignLayerConfig extends FeatureConfig {
  backgroundColor: string; // Base background color for the layer
}

/**
 * Configuration for blob appearance per artifact type
 */
export interface BlobStyle {
  color: string; // Base color for the blob
  borderColor: string; // Border color (usually same as color but more opaque)
  pattern?: BlobPattern; // Optional background pattern
}

/**
 * Available background patterns for blobs
 */
export type BlobPattern =
  | "none"
  | "triangles" // Forest-like triangle pattern
  | "circles" // Coin/treasure pattern
  | "waves" // Water pattern
  | "diamonds"; // Crystal pattern

/**
 * Represents a design blob in the layer
 */
export interface DesignBlob {
  id: string;
  artifactType: ArtifactType;
  path: string; // SVG path data for the blob shape
  bounds: BlobBounds;
  style: BlobStyle;
  artifactIds: string[]; // IDs of artifacts this blob encompasses
}

export interface BlobBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Blob style mappings per artifact type
 * Only artifact types listed here will have blobs generated
 */
export const BLOB_STYLES: Partial<Record<ArtifactType, BlobStyle>> = {
  paper: {
    color: "rgba(34, 139, 34, 0.15)", // Forest green, see-through
    borderColor: "rgba(34, 139, 34, 0.6)",
    pattern: "triangles",
  },
  silver: {
    color: "rgba(139, 90, 43, 0.15)", // Brown, see-through
    borderColor: "rgba(139, 90, 43, 0.6)",
    pattern: "circles",
  },
  gold: {
    color: "rgba(139, 90, 43, 0.15)", // Brown (same as silver for merging)
    borderColor: "rgba(139, 90, 43, 0.6)",
    pattern: "circles",
  },
  diamond: {
    color: "rgba(100, 149, 237, 0.15)", // Cornflower blue
    borderColor: "rgba(100, 149, 237, 0.6)",
    pattern: "diamonds",
  },
  portal: {
    color: "rgba(138, 43, 226, 0.15)", // Purple, see-through
    borderColor: "rgba(138, 43, 226, 0.6)",
    pattern: "waves",
  },
  // direction has no blob (connected by path instead)
};

/**
 * Group artifact types that should merge their blobs together
 */
export const BLOB_MERGE_GROUPS: ArtifactType[][] = [
  ["silver", "gold"], // Coins merge together
];
