// Travel feature types

import type { FeatureConfig } from "../../core/types";

export interface TravelFeatureConfig extends FeatureConfig {
  // Fade duration in milliseconds
  fadeDuration?: number;
}

export interface TravelDestination {
  url: string;
  title?: string;
}

