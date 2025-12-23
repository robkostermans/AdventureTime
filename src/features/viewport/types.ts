// Viewport feature types

import type { FeatureConfig } from "../../core/types";

export interface ViewportFeatureConfig extends FeatureConfig {
  size: number; // Viewport size in pixels (square)
}

export interface ViewportElements {
  container: HTMLDivElement;
  mask: HTMLDivElement;
}

