// Viewport feature types

import type { FeatureConfig } from "../../core/types";

export interface ViewportFeatureConfig extends FeatureConfig {
  maxWidth: number; // Maximum viewport width in pixels (for larger screens)
  maxHeight: number; // Maximum viewport height in pixels (for larger screens)
}

export interface ViewportElements {
  container: HTMLDivElement;
  mask: HTMLDivElement;
}

