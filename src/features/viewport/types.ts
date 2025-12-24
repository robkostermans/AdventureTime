// Viewport feature types

import type { FeatureConfig } from "../../core/types";

export interface ViewportFeatureConfig extends FeatureConfig {
  // Percentage of screen to use (0-100) - maintains window aspect ratio
  sizePercent: number;
  // Breakpoint below which viewport becomes full screen (in pixels)
  mobileBreakpoint: number;
}

export interface ViewportElements {
  container: HTMLDivElement;
  mask: HTMLDivElement;
}

