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
  moveToPosition,
  cancelMoveToPosition,
} from "./input";
export type {
  InputFeatureConfig,
  InputState,
  InputCallback,
  AvatarDirectionCallback,
  MovementStopCallback,
} from "./types";
