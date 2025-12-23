// Interaction layer feature exports

export {
  initInteraction,
  destroyInteraction,
  getInteractionLayer,
  getArtifacts,
  removeArtifact,
  rescanArtifacts,
  updateArtifactViewportStates,
} from "./interaction";

export type {
  InteractionFeatureConfig,
  Artifact,
  ArtifactType,
} from "./types";

export {
  ARTIFACT_PRIORITY,
  ARTIFACT_ICONS,
  ARTIFACT_SELECTORS,
} from "./types";

