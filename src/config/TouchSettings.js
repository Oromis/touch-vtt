import {MODULE_NAME} from './ModuleConstants.js'

export const GESTURE_MODE_SETTING = "gestureMode"
export const GESTURE_MODE_COMBINED = "combined"
export const GESTURE_MODE_SPLIT = "split"

export function registerTouchSettings() {
  game.settings.register(MODULE_NAME, GESTURE_MODE_SETTING, {
    name: "Zoom / Pan Gestures",
    hint: "Select the gesture to use for zooming & panning the game canvas",
    scope: "client",
    config: true,
    type: String,
    choices: {
      [GESTURE_MODE_COMBINED]: "Zoom & Pan with 2 fingers",
      [GESTURE_MODE_SPLIT]: "Zoom with 2 fingers, pan with 3 fingers",
    },
    default: GESTURE_MODE_COMBINED,
    onChange: value => {
      console.log(value)
    }
  })
}
