import {MODULE_NAME} from './ModuleConstants.js'
import {updateButtonSize} from '../tools/EnlargeButtonsTool'

export const GESTURE_MODE_SETTING = "gestureMode"
export const GESTURE_MODE_COMBINED = "combined"
export const GESTURE_MODE_SPLIT = "split"

export const DIRECTIONAL_ARROWS_SETTING = "directionalArrows"
export const DIRECTIONAL_ARROWS_OFF = "off"
export const DIRECTIONAL_ARROWS_ON = "on"

export const LARGE_BUTTONS_SETTING = "largeButtons"

export const EASY_TARGET_SETTING = "easyTarget"
export const EASY_TARGET_OFF = "off"
export const EASY_TARGET_SINGLE = "single"
export const EASY_TARGET_MULTIPLE = "multiple"

export const MEASUREMENT_HUD_SETTING = "measurementHud"
export const MEASUREMENT_HUD_OFF = "off"
export const MEASUREMENT_HUD_RIGHT = "right"
export const MEASUREMENT_HUD_LEFT = "left"

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
  })

  game.settings.register(MODULE_NAME, DIRECTIONAL_ARROWS_SETTING, {
    name: "Direction arrows in Token HUD",
    hint: "Enables / disables the addition of arrow buttons used to rotate a token in the token's right-click menu",
    scope: "client",
    config: true,
    type: String,
    choices: {
      [DIRECTIONAL_ARROWS_ON]: "On",
      [DIRECTIONAL_ARROWS_OFF]: "Off",
    },
    default: DIRECTIONAL_ARROWS_ON,
  })

  game.settings.register(MODULE_NAME, EASY_TARGET_SETTING, {
    name: "Targeting behavior",
    hint: "Controls if and how unowned tokens can be targeted via the touch interface",
    scope: "client",
    config: true,
    type: String,
    choices: {
      [EASY_TARGET_OFF]: "Disabled",
      [EASY_TARGET_SINGLE]: "Allow single target",
      [EASY_TARGET_MULTIPLE]: "Allow multiple targets",
    },
    default: EASY_TARGET_SINGLE,
  })

  game.settings.register(MODULE_NAME, MEASUREMENT_HUD_SETTING, {
    name: "Measurement HUD",
    hint: "Shows a UI while measuring distance with the ruler, allowing you to set waypoints or move your token",
    scope: "client",
    config: true,
    type: String,
    choices: {
      [MEASUREMENT_HUD_OFF]: "Disabled",
      [MEASUREMENT_HUD_RIGHT]: "Show right",
      [MEASUREMENT_HUD_LEFT]: "Show left",
    },
    default: MEASUREMENT_HUD_RIGHT,
  })

  game.settings.register(MODULE_NAME, LARGE_BUTTONS_SETTING, {
    name: "Enlarge buttons in on-screen UI",
    hint: "Increases the size of menu bar buttons to make them easier to use with touch controls",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: enabled => updateButtonSize(enabled),
  })
}
