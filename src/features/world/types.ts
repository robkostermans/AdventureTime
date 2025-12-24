// World feature types

import type { FeatureConfig, Vector2D } from "../../core/types";

export interface WorldFeatureConfig extends FeatureConfig {
  // Optional visual properties (CSS defaults used if not provided)
  backgroundColor?: string; // Extended border background color (default: #1a1a2e)
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface WorldState {
  position: Vector2D; // Current world offset (inverted from avatar position)
  bounds: WorldBounds; // World movement boundaries
}
