import {MODULE_DISPLAY_NAME} from "./config/ModuleConstants.js"

import {wrapMethod} from "./utils/Injection"

import CanvasTouchPointerEventsManager from "./logic/CanvasTouchPointerEventsManager.js"
import WindowAppAdapter from "./logic/WindowAppAdapter.js"
import {dispatchModifiedEvent} from "./logic/FakeTouchEvent.js"

import "../style/touch-vtt.css"
import {registerTouchSettings, getSetting, CORE_FUNCTIONALITY, DEBUG_MODE_SETTING, REMOVE_HOVER_EFFECTS, CANVAS_LONG_PRESS_TIMEOUT, CANVAS_RIGHT_CLICK_TIMEOUT} from "./config/TouchSettings.js"
import {MeasuredTemplateManager, installMeasurementTemplateEraser} from "./tools/MeasuredTemplateManagement.js"
import {callbackForWallTools, installWallToolsControls, initWallTools} from "./tools/WallTools.js"
import {callbackForSnapToGrid, installSnapToGrid} from "./tools/SnapToGridTool.js"
import {installTokenEraser} from "./tools/TokenEraserTool.js"
import {callbackForEasyTarget} from "./logic/EasyTarget"
import {initDirectionalArrows} from "./logic/DirectionalArrows"
import {initEnlargeButtonTool} from "./tools/EnlargeButtonsTool"
import {installDrawingToolsControls} from "./tools/DrawingTools"
import {initMeasurementHud, initDragRulerMeasurementHud} from "./tools/MeasurementHud"
import {installUtilityControls} from "./tools/UtilityControls"

import {TouchVTTMouseInteractionManager} from "./logic/TouchVTTMouseInteractionManager.js"

if (!window.TouchEvent) {
  window.TouchEvent = function() {}
  window.TouchEvent.prototype = {}
}

let canvasRightClickTimeout = null
let canvasLongPressTimeout = null
let canvasTouchPointerEventsManager = null
const measuredTemplateManager = MeasuredTemplateManager.init()
let windowAppAdapter = null
let _usingTouch = false

function findCanvas() {
  return document.querySelector("canvas#board") ||
    document.querySelector("body > canvas") ||
    document.querySelector("canvas")
}

function setUsingTouch(usingTouch) {
  const mouseInteractionManager = game.release.generation < 13 ? MouseInteractionManager : foundry.canvas.interaction.MouseInteractionManager
  _usingTouch = usingTouch
  if (usingTouch) {
    mouseInteractionManager.LONG_PRESS_DURATION_MS = 99999999
    document.body.classList.add("touchvtt-using-touch")
    
    if (getSetting(REMOVE_HOVER_EFFECTS) || false) {
      try {
        for (let styleSheet of document.styleSheets) {
          if (!styleSheet.cssRules) continue
    
          for (var ri = styleSheet.cssRules.length - 1; ri >= 0; ri--) {
            let selectorText = styleSheet.cssRules[ri].selectorText
            if (!selectorText) continue
    
            if (selectorText.match(":hover") && !selectorText.match(".control-tools")) {
              styleSheet.deleteRule(ri)
            }
          }
        }

      } catch (ex) {}
    }

  } else {
    mouseInteractionManager.LONG_PRESS_DURATION_MS = 500
    document.body.classList.remove("touchvtt-using-touch")
  }
}

console.log(`${MODULE_DISPLAY_NAME} booting ...`)

Hooks.on("getSceneControlButtons", (controls) => {
  if (getSetting(CORE_FUNCTIONALITY) || false) {
    installMeasurementTemplateEraser(controls)
    installWallToolsControls(controls)
    installDrawingToolsControls(controls)
    installSnapToGrid(controls)
    installTokenEraser(controls)
  }
})

Hooks.on("renderSceneControls", (controls) => {
  if (getSetting(CORE_FUNCTIONALITY) || false) {
    installUtilityControls()
  }
})

Hooks.once("init", () => {
  registerTouchSettings()

  if (getSetting(CORE_FUNCTIONALITY) || false) {

    ["renderDocumentDirectory", "renderDirectoryApplication", "changeSidebarTab"].forEach(hook => {
      Hooks.on(hook, function(directory) {
        windowAppAdapter.fixDirectoryScrolling(directory, _usingTouch)
      })
    })

    initEnlargeButtonTool()
    initDirectionalArrows()
    measuredTemplateManager.initMeasuredTemplateManagement()
    initWallTools()
    if (game.release.generation > 12) {
      initDragRulerMeasurementHud()
    }

    if (game.release.generation < 12) {
      // The only clean way I found to patch v11's MouseInteractionManager. The only difference is a listener for mouseupoutside is now pointerupoutside (see https://github.com/foundryvtt/foundryvtt/issues/10236)
      MouseInteractionManager = TouchVTTMouseInteractionManager
    }

    // This wrap gives us control over every MouseInteractionManager
    const mouseInteractionManagerPath = game.release.generation < 13 ? "MouseInteractionManager" : "foundry.canvas.interaction.MouseInteractionManager"
    wrapMethod(`${mouseInteractionManagerPath}.prototype.callback`, async function (originalMethod, event, ...args) {
      if (event == "clearTimeouts") {
        clearTimeout(canvasRightClickTimeout)
        clearTimeout(canvasLongPressTimeout)
        return
      }
      
      if (getSetting(DEBUG_MODE_SETTING)) {
        console.log(
          "TouchVTT: MIM:", this.object.constructor.name, event,
          "; PIXI event:", args[0].constructor.name, args[0].pointerType, args[0].type, "target=" + args[0].target.constructor.name,
          "; native event:", args[0].nativeEvent?.constructor.name, args[0].nativeEvent?.pointerType, args[0].nativeEvent?.type, args[0].nativeEvent?.touchvttTrusted, "defaultPrevented=" + args[0].nativeEvent?.defaultPrevented,
        )
      }
      
      if (["touch", "pen"].includes(args[0].pointerType) || args[0].nativeEvent?.touchvttTrusted) {
      
        if (args[0].pointerType === "touch" || args[0].nativeEvent.touchvttTrusted) {
      
          // v12+ only: ugly patch to fix annoying issue where a double-click that opens a sheet also sends one of the clicks to an active listener on the sheet.
          // For example, you open an actor sheet, if something clickable is under your finger (icon, action, ability, etc.) it will get wrongly clicked.
          // What we do here is delay the sheet rendering a little bit, and also dispatch a right click on the canvas to avoid a lingering drag select on the placeable.
          if (game.release.generation >= 12) {
            if (event === "clickLeft2") {
              await new Promise(resolve => setTimeout(resolve, 100))
              canvas.app.view.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, view: window, button: 2}))
              return originalMethod.call(this, event, ...args)
            }
          }
      
          // The right-click timeout is to send a right click on long press (doesn't happen by default on the canvas)
          // The long press timeout is to send a long press event, mostly used for pinging
          if (event === "clickLeft") {
            clearTimeout(canvasRightClickTimeout)
            clearTimeout(canvasLongPressTimeout)
            canvasRightClickTimeout = setTimeout(() => {
              if (canvasTouchPointerEventsManager.touchIds.length < 2) {
                // We used to dispatch the pointerup for the original touch, but that clears the timeouts for right-click/longpress. Seems to be ok like this.
                //dispatchModifiedEvent(args[0], "pointerup")
                dispatchModifiedEvent(args[0], "pointerdown", {button: 2, buttons: 2})
              }
            }, getSetting(CANVAS_RIGHT_CLICK_TIMEOUT))
            canvasLongPressTimeout = setTimeout(() => {
              if (canvasTouchPointerEventsManager.touchIds.length < 2) {
                canvas.currentMouseManager = this
                this.callbacks["longPress"](args[0], args[0].interactionData.origin)
              }
            }, getSetting(CANVAS_LONG_PRESS_TIMEOUT))
          } else if (!["clickRight"].includes(event)) {
            clearTimeout(canvasRightClickTimeout)
            clearTimeout(canvasLongPressTimeout)
          }
          
          callbackForSnapToGrid(event, args)
      
        }
      
        callbackForEasyTarget(event, args)
      
        // For some reason we receive an empty origin for a touch/pen longPress, but we can get it from the event itself
        if (event === "longPress" && !args[1]) {
          args[1] = args[0].interactionData.origin
        }

        // Fix for v13 ruler throwing an error on dragLeftCancel when contexts is not there
        if (event === "dragLeftCancel" && !args[0].interactionData?.contexts) {
          foundry.utils.setProperty(args[0], "interactionData.contexts", {})
        }
        
      }
      
      return originalMethod.call(this, event, ...args)

    }, "MIXED")

    // This wrap is used for wall chaining: when the chain button is active, pretend we are holding Ctrl
    wrapMethod("game.keyboard.isModifierActive", function(originalMethod, modifier) {
      var result = originalMethod.call(this, modifier)
      result ||= callbackForWallTools(modifier)
      return result
    }, "MIXED")

    // Adapter for various touch events in windows
    windowAppAdapter = WindowAppAdapter.init()

  } else {
    console.info(`${MODULE_DISPLAY_NAME} is active, but core functionality has been disabled in the settings.`)
  }

})

Hooks.on("canvasReady", function() {
  // This (together with the hud init in the ready hook) gives the user a touch-friendly UI for pre-made templates (like from an automatic "Place Measured Template" chat button, or MidiQOL)
  canvas.templates.preview.on("childAdded", measuredTemplateManager.onTemplatePreviewCreated.bind(measuredTemplateManager))
})

Hooks.on("ready", function () {
  if (getSetting(CORE_FUNCTIONALITY) || false) {
    try {
      const canvasElem = findCanvas()
      if (canvasElem) {
        // This sets up the main listener on the canvas
        // It keeps track of touches and handles pan/zoom gestures
        canvasTouchPointerEventsManager = CanvasTouchPointerEventsManager.init(canvasElem)
        initMeasurementHud({ touchPointerEventsManager: canvasTouchPointerEventsManager })

        // The measured template hud mentioned in the canvasReady hook
        measuredTemplateManager.initMeasuredTemplateHud(canvasTouchPointerEventsManager)

        console.info(`${MODULE_DISPLAY_NAME} started successfully.`)
      } else {
        console.warn(`Failed to find canvas element. ${MODULE_DISPLAY_NAME} will not be available.`)
      }

      ["pointerdown", "pointerup"].forEach(e => {
        document.body.addEventListener(e, evt => {
          if (evt.isTrusted) {
            if (evt.pointerType == "mouse") {
              setUsingTouch(false)
            } else if (["touch", "pen"].includes(evt.pointerType)) {
              setUsingTouch(true)
            }
          }
        }, true)
      })

    } catch (e) {
      console.error(`Failed to initialize ${MODULE_DISPLAY_NAME}: `, e)
    }
  }

  if (getSetting(DEBUG_MODE_SETTING)) {
    [
      "pointerdown", "pointerup", "pointermove", "pointercancel", "pointerenter", "pointerleave", "pointerover", "pointerout",
      "touchstart", "touchmove", "touchend",
      "mousedown", "mouseup", "mousemove", "mouseenter", "mouseleave", "mouseover", "mouseout"
    ].forEach(e => {
      document.body.addEventListener(e, evt => {
        console.log(MODULE_DISPLAY_NAME + ": " + evt.target.tagName, evt.type, evt.pointerType, evt.pointerId, "trusted:" + evt.isTrusted + "," + evt.touchvttTrusted, "buttons:" + evt.button + "," + evt.buttons, evt.clientX, evt.clientY)
      }, true)
    })
  }

})
