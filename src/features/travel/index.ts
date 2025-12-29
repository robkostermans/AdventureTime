// Travel feature exports

export {
  initTravel,
  destroyTravel,
  travelToDestination,
  travelBack,
  canTravelBack,
  getPreviousPageUrlForDisplay,
  isSameOrigin,
} from "./travel";

export type { TravelFeatureConfig, TravelDestination } from "./types";

