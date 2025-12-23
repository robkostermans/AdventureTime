// Navigation feature types

import type { FeatureConfig } from "../../core/types";

export interface NavigationFeatureConfig extends FeatureConfig {
  // Distance from avatar center to indicator (in pixels)
  indicatorDistance: number;
  // Show indicator only when standing still (inverted behavior)
  // Default: false (show when moving)
  showWhenStill?: boolean;
  // Optional visual properties (CSS defaults used if not provided)
  indicatorSize?: number; // Size of the indicator dot (default: 8px)
  indicatorColor?: string; // Color of the indicator (default: #FFD700 gold)
}

