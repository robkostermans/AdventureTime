// Story mode feature types

import type { FeatureConfig } from "../../core/types";
import type { ArtifactType } from "../interaction/types";

export interface StoryModeFeatureConfig extends FeatureConfig {
  typewriterSpeed: number; // Characters per second for typewriter effect
}

export interface StoryState {
  isActive: boolean; // Whether story terminal is currently showing
  currentArtifactId: string | null; // ID of artifact being interacted with
  selectedOptionIndex: number; // Currently selected option (0 or 1)
  phase: StoryPhase; // Current phase of the story interaction
}

export type StoryPhase =
  | "discovery" // Showing "You have found a..."
  | "choice" // Showing options
  | "result" // Showing result of choice
  | "idle"; // Not active

export interface StoryContent {
  artifactId: string;
  artifactType: ArtifactType;
  icon: string;
  typeName: string;
  content: string;
  isIntro?: boolean;
  introText?: string;
  originalHref?: string;
}

/**
 * Labels for artifact types in story mode
 */
export const STORY_TYPE_LABELS: Record<ArtifactType, string> = {
  portal: "portal",
  paper: "scroll",
  direction: "sign",
  diamond: "diamond",
  silver: "silver coin",
  gold: "gold coin",
};

/**
 * Action verbs for taking different artifact types
 */
export const STORY_TAKE_VERBS: Record<ArtifactType, string> = {
  portal: "step through",
  paper: "take",
  direction: "read", // Direction artifacts can only be read, not taken
  diamond: "take",
  silver: "take",
  gold: "take",
};

/**
 * Result messages for taking different artifact types
 */
export const STORY_TAKE_RESULTS: Record<ArtifactType, string> = {
  portal: "You step through the swirling portal...",
  paper: "You carefully roll up the scroll and place it in your bag.",
  direction: "You take note of the sign's message.",
  diamond: "The diamond sparkles as you add it to your collection.",
  silver: "The silver coin clinks as it joins your pouch.",
  gold: "The gold coin gleams as you pocket it.",
};

/**
 * Result messages for leaving different artifact types
 */
export const STORY_LEAVE_RESULTS: Record<ArtifactType, string> = {
  portal: "You decide not to enter the portal... for now.",
  paper: "You leave the scroll where it lies.",
  direction: "You continue on your way.",
  diamond: "You leave the diamond untouched.",
  silver: "You leave the silver coin behind.",
  gold: "You leave the gold coin where it rests.",
};

