// Input handler feature types

import type { FeatureConfig, Vector2D } from "../../core/types";

export interface InputFeatureConfig extends FeatureConfig {
  speed: number; // Movement speed in pixels per frame
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type InputCallback = (direction: Vector2D) => void;

// Callback for avatar direction updates (non-inverted direction for rotation)
export type AvatarDirectionCallback = (direction: Vector2D) => void;

// Callback for when movement stops
export type MovementStopCallback = () => void;
