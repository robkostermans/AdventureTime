// Input feature exports

export {
  initInput,
  destroyInput,
  setMovementCallback,
  setAvatarDirectionCallback,
  setMovementStopCallback,
  getInputState,
  setSpeed,
  getSpeed,
  pauseInput,
  resumeInput,
  isInputPaused,
} from "./input";
export type {
  InputFeatureConfig,
  InputState,
  InputCallback,
  AvatarDirectionCallback,
  MovementStopCallback,
} from "./types";
