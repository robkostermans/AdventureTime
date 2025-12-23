// World feature types

import type { FeatureConfig, Vector2D } from "../../core/types";

export interface WorldFeatureConfig extends FeatureConfig {
  viewportSize: number; // Viewport size for calculating boundaries
  backgroundColor: string; // Extended border background color
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

