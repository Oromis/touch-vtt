import {MODULE_NAME, MODULE_DISPLAY_NAME} from "./ModuleConstants.js"
import {updateButtonSize} from "../tools/EnlargeButtonsTool"
import {toggleUtilityControls} from "../tools/UtilityControls.js"
import {GestureCalibrationMenu} from "./GestureCalibrationMenu.js"

export const CORE_FUNCTIONALITY = "core"

export const GESTURE_MODE_SETTING = "gestureMode"
export const GESTURE_MODE_OFF = "off"
export const GESTURE_MODE_COMBINED = "combined"
export const GESTURE_MODE_SPLIT = "split"

export const DIRECTIONAL_ARROWS_SETTING = "directionalArrows"
export const DIRECTIONAL_ARROWS_OFF = "off"
export const DIRECTIONAL_ARROWS_ON = "on"

export const LARGE_BUTTONS_SETTING = "largeButtons"

export const PAUSE_BUTTON_SETTING = "pauseButton"

export const REMOVE_HOVER_EFFECTS = "removeHover"

export const EASY_TARGET_SETTING = "easyTarget"
export const EASY_TARGET_OFF = "off"
export const EASY_TARGET_SINGLE = "single"
export const EASY_TARGET_MULTIPLE = "multiple"

export const MEASUREMENT_HUD_SETTING = "measurementHud"
export const MEASUREMENT_HUD_OFF = "off"
export const MEASUREMENT_HUD_RIGHT = "right"
export const MEASUREMENT_HUD_LEFT = "left"

export const CANVAS_RIGHT_CLICK_TIMEOUT = "canvasRightClickTimeout"
export const CANVAS_LONG_PRESS_TIMEOUT = "canvasLongPressTimeout"

export const ZOOM_THRESHOLD_SETTING = "zoomThreshold"
export const PAN_THRESHOLD_SETTING = "panThreshold"

export const DEBUG_MODE_SETTING = "debugMode"

export function getSetting(settingName) {
  let overrideSettingValue
  try {
    overrideSettingValue = game.settings.get(MODULE_NAME, settingName + "_override")
  } catch(e) {
    overrideSettingValue = "override_off"
  }
  if (overrideSettingValue == "override_off") {
    return game.settings.get(MODULE_NAME, settingName)
  }
  if (game.settings.settings.get(MODULE_NAME + "." + settingName).type.name == "Boolean") {
    overrideSettingValue = (overrideSettingValue == "on")
  }
  return overrideSettingValue  
}

class SettingsOverrideMenu extends FormApplication {
  constructor() {
    super()
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["form"],
      popOut: true,
      template: `/modules/${MODULE_NAME}/templates/settings-override.hbs`,
      id: `${MODULE_NAME}-settings-override-form`,
      title: `${MODULE_DISPLAY_NAME} - Settings Override`,
    })
  }

  getData() {
    const touchVttOverrideSettings = [...game.settings.settings].filter(s => s[0].startsWith(MODULE_NAME) && s[0].endsWith("_override"))
    const data = {
      settings: Object.fromEntries(
        [...touchVttOverrideSettings]
          .map(s => {
            s[0] = s[0].split(".")[1]
            var settingValue = game.settings.get(MODULE_NAME, s[0])
            s[1].currentValue = settingValue
            return s
          })
      ),
    }
    // Send data to the template
    return data
  }

  async _updateObject(event, formData) {
    const data = expandObject(formData)
    for (let setting in data) {
      game.settings.set(MODULE_NAME, setting, data[setting])
    }
    this.reloadConfirm()
  }

  async reloadConfirm() {
    const reload = await Dialog.confirm({
      title: game.i18n.localize("SETTINGS.ReloadPromptTitle"),
      content: `<p>${game.i18n.localize("SETTINGS.ReloadPromptBody")}</p>`
    })
    if ( !reload ) return
    if ( game.user.isGM ) game.socket.emit("reload")
    foundry.utils.debouncedReload()
  }

  activateListeners(html) {
    super.activateListeners(html)
  }
}

export function registerTouchSettings() {
  // Overrides

  game.settings.register(MODULE_NAME, CORE_FUNCTIONALITY + "_override", {
    name: "Core Functionality",
    hint: "Caution: disabling this option will remove all TouchVTT functionality, and other options will be ignored",
    scope: "world",
    config: false,
    type: String,
    choices: {
      ["on"]: "On",
      ["off"]: "Off",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, GESTURE_MODE_SETTING + "_override", {
    name: "Zoom / Pan Gestures",
    hint: "Select the gesture to use for zooming & panning the game canvas",
    scope: "world",
    config: false,
    type: String,
    choices: {
      [GESTURE_MODE_COMBINED]: "Zoom & Pan with 2 fingers",
      [GESTURE_MODE_SPLIT]: "Zoom with 2 fingers, pan with 3 fingers",
      [GESTURE_MODE_OFF]: "No zoom or pan gestures",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, DIRECTIONAL_ARROWS_SETTING + "_override", {
    name: "Direction arrows in Token HUD",
    hint: "Enables / disables the addition of arrow buttons used to rotate a token in the token's right-click menu",
    scope: "world",
    config: false,
    type: String,
    choices: {
      [DIRECTIONAL_ARROWS_ON]: "On",
      [DIRECTIONAL_ARROWS_OFF]: "Off",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, EASY_TARGET_SETTING + "_override", {
    name: "Targeting behavior",
    hint: "Controls if and how unowned tokens can be targeted via the touch interface",
    scope: "world",
    config: false,
    type: String,
    choices: {
      [EASY_TARGET_OFF]: "Disabled",
      [EASY_TARGET_SINGLE]: "Allow single target",
      [EASY_TARGET_MULTIPLE]: "Allow multiple targets",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, MEASUREMENT_HUD_SETTING + "_override", {
    name: "Measurement HUD",
    hint: "Shows a UI while measuring distance with the ruler, allowing you to set waypoints or move your token",
    scope: "world",
    config: false,
    type: String,
    choices: {
      [MEASUREMENT_HUD_OFF]: "Disabled",
      [MEASUREMENT_HUD_RIGHT]: "Show right",
      [MEASUREMENT_HUD_LEFT]: "Show left",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, LARGE_BUTTONS_SETTING + "_override", {
    name: "Enlarge buttons in on-screen UI",
    hint: "Increases the size of menu bar buttons to make them easier to use with touch controls",
    scope: "world",
    config: false,
    type: String,
    choices: {
      ["on"]: "On",
      ["off"]: "Off",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, PAUSE_BUTTON_SETTING + "_override", {
    name: "Show a play/pause button",
    hint: "Adds a play/pause button to the UI controls",
    scope: "world",
    config: false,
    type: String,
    choices: {
      ["on"]: "On",
      ["off"]: "Off",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, REMOVE_HOVER_EFFECTS + "_override", {
    name: "Remove hover effects",
    hint: "Disable hover effects on touch devices",
    scope: "world",
    config: false,
    type: String,
    choices: {
      ["on"]: "On",
      ["off"]: "Off",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, CANVAS_RIGHT_CLICK_TIMEOUT + "_override", {
    name: "Canvas right-click timer (ms)",
    hint: "How long a touch on the canvas takes to become a right click",
    scope: "world",
    config: false,
    type: String,
    choices: {
      ["on"]: "On",
      ["off"]: "Off",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  game.settings.register(MODULE_NAME, CANVAS_LONG_PRESS_TIMEOUT + "_override", {
    name: "Canvas ping timer (ms)",
    hint: "How long a touch on the canvas takes to become a ping",
    scope: "world",
    config: false,
    type: String,
    choices: {
      ["on"]: "On",
      ["off"]: "Off",
      ["override_off"]: "Don't override"
    },
    default: "override_off",
  })

  // Client settings

  game.settings.register(MODULE_NAME, CORE_FUNCTIONALITY, {
    name: "Core Functionality" + (game.settings.get(MODULE_NAME, CORE_FUNCTIONALITY + "_override") == "override_off" ? "" : " *"),
    hint: "Caution: disabling this option will remove all TouchVTT functionality, and other options will be ignored",
    scope: "client",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: true,
  })

  game.settings.register(MODULE_NAME, GESTURE_MODE_SETTING, {
    name: "Zoom / Pan Gestures" + (game.settings.get(MODULE_NAME, GESTURE_MODE_SETTING + "_override") == "override_off" ? "" : " *"),
    hint: "Select the gesture to use for zooming & panning the game canvas",
    scope: "client",
    config: true,
    type: String,
    choices: {
      [GESTURE_MODE_COMBINED]: "Zoom & Pan with 2 fingers",
      [GESTURE_MODE_SPLIT]: "Zoom with 2 fingers, pan with 3 fingers",
      [GESTURE_MODE_OFF]: "No zoom or pan gestures",
    },
    default: GESTURE_MODE_COMBINED,
  })

  game.settings.register(MODULE_NAME, ZOOM_THRESHOLD_SETTING, {
    name: "Zoom Sensitivity",
    hint: "Sensitivity of the zoom gesture (if enabled)",
    scope: "client",
    config: false,
    type: Number,
    range: {
      min: 0,
      max: 100,
      step: 1
    },
    default: 100,
  })

  game.settings.register(MODULE_NAME, PAN_THRESHOLD_SETTING, {
    name: "Pan Sensitivity",
    hint: "Sensitivity of the pan gesture (if enabled)",
    scope: "client",
    config: false,
    type: Number,
    range: {
      min: 0,
      max: 100,
      step: 1
    },
    default: 100,
  })

  game.settings.register(MODULE_NAME, DIRECTIONAL_ARROWS_SETTING, {
    name: "Direction arrows in Token HUD" + (game.settings.get(MODULE_NAME, DIRECTIONAL_ARROWS_SETTING + "_override") == "override_off" ? "" : " *"),
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
    name: "Targeting behavior" + (game.settings.get(MODULE_NAME, EASY_TARGET_SETTING + "_override") == "override_off" ? "" : " *"),
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
    name: "Measurement HUD" + (game.settings.get(MODULE_NAME, MEASUREMENT_HUD_SETTING + "_override") == "override_off" ? "" : " *"),
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
    name: "Enlarge buttons in on-screen UI" + (game.settings.get(MODULE_NAME, LARGE_BUTTONS_SETTING + "_override") == "override_off" ? "" : " *"),
    hint: "Increases the size of menu bar buttons to make them easier to use with touch controls",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: enabled => updateButtonSize(enabled),
  })

  game.settings.register(MODULE_NAME, PAUSE_BUTTON_SETTING, {
    name: "Show a play/pause button" + (game.settings.get(MODULE_NAME, PAUSE_BUTTON_SETTING + "_override") == "override_off" ? "" : " *"),
    hint: "Adds a play/pause button to the UI controls",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: enabled => toggleUtilityControls(enabled),
  })

  game.settings.register(MODULE_NAME, REMOVE_HOVER_EFFECTS, {
    name: "Remove hover effects" + (game.settings.get(MODULE_NAME, REMOVE_HOVER_EFFECTS + "_override") == "override_off" ? "" : " *"),
    hint: "Disable hover effects on touch devices",
    scope: "client",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: false,
  })

  game.settings.register(MODULE_NAME, CANVAS_RIGHT_CLICK_TIMEOUT, {
    name: "Canvas right-click timer (ms)" + (game.settings.get(MODULE_NAME, CANVAS_RIGHT_CLICK_TIMEOUT + "_override") == "override_off" ? "" : " *"),
    hint: "How long a touch on the canvas takes to become a right click",
    scope: "client",
    config: true,
    type: Number,
    range: {
      min: 100,
      step: 50,
      max: 3000
    },
    default: 400,
  })

  game.settings.register(MODULE_NAME, CANVAS_LONG_PRESS_TIMEOUT, {
    name: "Canvas ping timer (ms)" + (game.settings.get(MODULE_NAME, CANVAS_LONG_PRESS_TIMEOUT + "_override") == "override_off" ? "" : " *"),
    hint: "How long a touch on the canvas takes to become a ping",
    scope: "client",
    config: true,
    type: Number,
    range: {
      min: 100,
      step: 50,
      max: 3000
    },
    default: 1000,
  })

  game.settings.register(MODULE_NAME, DEBUG_MODE_SETTING, {
    name: "Enable Debug Mode",
    hint: "Sends additional log messages to the developer console",
    scope: "client",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: false,
  })

  // Override menu
  game.settings.registerMenu(MODULE_NAME, "SettingsOverrideMenu", {
    name: "Client Settings Overrides",
    label: "Configure Overrides",
    hint: "Configure which client settings are forced by the GM.",
    icon: "fas fa-bars",
    type: SettingsOverrideMenu,
    restricted: true
  })

  // Testing new calibration menu
  game.settings.registerMenu(MODULE_NAME, "GestureCalibrationMenu", {
    name: "Gesture Sensitivity Calibration",
    label: "Calibrate Touch Gestures",
    hint: "Gesture detection can be influenced by your display size and resolution. Use this tool to calibrate if you have issues with sensitivity.",
    icon: "fas fa-wrench",
    type: GestureCalibrationMenu,
    restricted: false
  })

  // Hook to disable overridden settings
  Hooks.on("renderSettingsConfig", (settingsConfig, settingsElem, settingsInfo) => {
    var touchVttSettings = settingsInfo.categories.find(c => c.id == MODULE_NAME).settings
    let overridePresent = false
    touchVttSettings.forEach(setting => {
      let overridden = setting.name.endsWith("*")
      let input = settingsElem.find(`[name="${setting.id}"]`)
      input.prop("disabled", overridden)
      overridePresent |= overridden
    })
    if (overridePresent) {
      settingsElem.find(`[data-tab="${MODULE_NAME}"] h2`).after($("<small>").html("Some settings, indicated with an asterisk (*), are being overridden by the GM. The values selected here might not be accurate."))
    }
  })

}
