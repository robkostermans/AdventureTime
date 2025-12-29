// Persistence feature exports

export {
  initPersistence,
  destroyPersistence,
  getGameState,
  saveGameState,
  getPageState,
  savePageState,
  saveArtifactPositions,
  getArtifactPositions,
  markArtifactCollected,
  markArtifactReturned,
  getStoredInventory,
  addInventoryItem,
  removeInventoryItem,
  clearInventory,
  addTravelHistory,
  getPreviousPageUrl,
  setPreviousPageUrl,
  hasArrivedViaPortal,
  clearArrivalFlag,
  hasVisitedCurrentPage,
  clearAllGameState,
  isPersistenceAvailable,
} from "./persistence";

export type {
  PersistenceFeatureConfig,
  StoredGameState,
  StoredInventoryItem,
  StoredPageState,
  StoredArtifactPosition,
  TravelHistoryEntry,
} from "./types";

