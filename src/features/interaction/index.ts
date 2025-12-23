// Interaction layer feature exports

export {
  initInteraction,
  destroyInteraction,
  getInteractionLayer,
  getArtifacts,
  removeArtifact,
  rescanArtifacts,
  updateArtifactViewportStates,
  createGhostMarker,
  getGhostMarkers,
  getIntroConfig,
} from "./interaction";

export type {
  InteractionFeatureConfig,
  Artifact,
  ArtifactType,
  GhostMarker,
} from "./types";

export {
  ARTIFACT_PRIORITY,
  ARTIFACT_ICONS,
  ARTIFACT_SELECTORS,
} from "./types";

