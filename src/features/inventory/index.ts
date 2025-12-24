// Inventory feature exports

export {
  initInventory,
  destroyInventory,
  enableCollisionDetection,
  getInventoryItems,
  isInventoryOpen,
  toggleInventory,
  openInventory,
  closeInventory,
} from "./inventory";

export type {
  InventoryFeatureConfig,
  InventoryItem,
  InventoryState,
} from "./types";

export {
  ARTIFACT_TYPE_LABELS,
  ARTIFACT_ACTION_LABELS,
} from "./types";

