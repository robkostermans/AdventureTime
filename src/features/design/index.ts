// Design layer feature exports

export {
  initDesignLayer,
  destroyDesignLayer,
  getDesignLayer,
  getBlobs,
  regenerateBlobs,
} from "./design";

export type {
  DesignLayerConfig,
  DesignBlob,
  BlobStyle,
  BlobPattern,
  BlobBounds,
} from "./types";

export {
  BLOB_STYLES,
  BLOB_MERGE_GROUPS,
} from "./types";

