// Input handler feature types

import type { FeatureConfig, Vector2D } from "../../core/types";

export interface InputFeatureConfig extends FeatureConfig {
  speed: number; // Maximum movement speed in pixels per frame
  acceleration: number; // How quickly to reach max speed (0-1, higher = faster)
  deceleration: number; // How quickly to slow down when stopping (0-1, higher = faster)
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type InputCallback = (direction: Vector2D) => void;

// Callback for avatar direction updates (non-inverted direction for rotation)
// velocityFactor is 0-1 representing current speed as fraction of max speed
export type AvatarDirectionCallback = (direction: Vector2D, velocityFactor: number) => void;

// Callback for when movement stops
export type MovementStopCallback = () => void;
