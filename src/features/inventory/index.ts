// Inventory feature exports

export {
  initInventory,
  destroyInventory,
  getInventoryItems,
  isInventoryOpen,
  isPopoverVisible,
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

