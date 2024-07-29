import {MODULE_DISPLAY_NAME} from './config/ModuleConstants.js'

import {wrapMethod} from './utils/Injection'

import TouchPointerEventsManager from './logic/TouchPointerEventsManager.js'
import WindowAppAdapter from './logic/WindowAppAdapter.js'
import {dispatchModifiedEvent} from './logic/FakeTouchEvent.js'

import '../style/touch-vtt.css'
import {registerTouchSettings, getSetting, CORE_FUNCTIONALITY, DEBUG_MODE_SETTING} from './config/TouchSettings.js'
import {MeasuredTemplateManager, installMeasurementTemplateEraser} from './tools/MeasuredTemplateManagement.js'
import {callbackForWallTools, installWallToolsControls, initWallTools} from './tools/WallTools.js'
import {callbackForSnapToGrid, installSnapToGrid} from './tools/SnapToGridTool.js'
import {installTokenEraser} from './tools/TokenEraserTool.js'
import {callbackForEasyTarget} from './logic/EasyTarget'
import {initDirectionalArrows} from './logic/DirectionalArrows'
import {initEnlargeButtonTool} from './tools/EnlargeButtonsTool'
import {installDrawingToolsControls} from './tools/DrawingTools'
import {initMeasurementHud} from './tools/MeasurementHud'
import {installUtilityControls} from './tools/UtilityControls'

import {TouchVTTMouseInteractionManager} from './logic/TouchVTTMouseInteractionManager.js'

let canvasRightClickTimeout = null
let canvasLongPressTimeout = null
const measuredTemplateManager = MeasuredTemplateManager.init()
let windowAppAdapter = null
let _usingTouch = false;

function findCanvas() {
  return document.querySelector('canvas#board') ||
    document.querySelector('body > canvas') ||
    document.querySelector('canvas')
}

function setUsingTouch(usingTouch) {
  _usingTouch = usingTouch
  if (usingTouch) {
    document.body.classList.add("touchvtt-using-touch")
  } else {
    document.body.classList.remove("touchvtt-using-touch")
  }
}

console.log(`${MODULE_DISPLAY_NAME} booting ...`)

Hooks.on('getSceneControlButtons', (controls) => {
  if (getSetting(CORE_FUNCTIONALITY) || false) {
    installMeasurementTemplateEraser(controls)
    installWallToolsControls(controls)
    installDrawingToolsControls(controls)
    installSnapToGrid(controls)
    installTokenEraser(controls)
  }
})

Hooks.once('renderSceneNavigation', (controls) => {
  if (getSetting(CORE_FUNCTIONALITY) || false) {
    installUtilityControls()
  }
})

Hooks.once('init', () => {
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

    if (game.release.generation < 12) {
      // The only clean way I found to patch v11's MouseInteractionManager. The only difference is a listener for mouseupoutside is now pointerupoutside (see https://github.com/foundryvtt/foundryvtt/issues/10236)
      MouseInteractionManager = TouchVTTMouseInteractionManager
    }

    // This wrap gives us control over every MouseInteractionManager
    wrapMethod('MouseInteractionManager.prototype.callback', async function (originalMethod, event, ...args) {
      
      if (["touch", "pen"].includes(args[0].pointerType)) {

        if (args[0].pointerType == "touch") {

          //console.log("MIM", this.object.constructor.name, event, ...args)

          // v12 only: ugly patch to fix annoying issue where a double-click that opens a sheet also sends one of the clicks to an active listener on the sheet.
          // For example, you open an actor sheet, if something clickable is under your finger (icon, action, ability, etc.) it will get wrongly clicked.
          // What we do here is delay the sheet rendering a little bit, and also dispatch a right click on the canvas to avoid a lingering drag select on the placeable.
          if (game.release.generation >= 12) {
            if (event == "clickLeft2") {
              await new Promise(resolve => setTimeout(resolve, 100))
              document.getElementById("board").dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, view: window, button: 2}))
              return originalMethod.call(this, event, ...args)
            }
          }

          // The right-click timeout is to send a right click on long press (doesn't happen by default on the canvas)
          // The long press timeout is to send a long press event, mostly used for pinging
          if (event == "clickLeft") {
            clearTimeout(canvasRightClickTimeout)
            clearTimeout(canvasLongPressTimeout)
            canvasRightClickTimeout = setTimeout(() => {
              dispatchModifiedEvent(args[0], "pointerup")
              dispatchModifiedEvent(args[0], "pointerdown", {button: 2, buttons: 2})
            }, 400)
            canvasLongPressTimeout = setTimeout(() => {
              this.callbacks["longPress"](args[0], args[0].interactionData.origin)
            }, 1000)
          } else {
            clearTimeout(canvasRightClickTimeout)
            clearTimeout(canvasLongPressTimeout)
          }
          
          callbackForSnapToGrid(event, args)

        }

        callbackForEasyTarget(event, args)

        // For some reason we receive an empty origin for a touch/pen longPress, but we can get it from the event itself
        if (event == "longPress" && !args[1]) {
          args[1] = args[0].interactionData.origin
        }

        // To remove an unwanted dragLeftCancel (we do a similar thing for walls)
        if (event == "dragLeftCancel" && args[0] instanceof PointerEvent) {
          args[0].preventDefault()
          return
        }
      
      }
      
      return originalMethod.call(this, event, ...args)

    }, 'MIXED')

    // This wrap is used for wall chaining: when the chain button is active, pretend we are holding Ctrl
    wrapMethod('game.keyboard.isModifierActive', function(originalMethod, modifier) {
      var result = originalMethod.call(this, modifier)
      result ||= callbackForWallTools(modifier)
      return result
    }, 'MIXED')

    // Adapter for various touch events in windows
    windowAppAdapter = WindowAppAdapter.init()

  } else {
    console.info(`${MODULE_DISPLAY_NAME} is active, but core functionality has been disabled in the settings.`)
  }

})

Hooks.on('ready', function () {
  if (getSetting(CORE_FUNCTIONALITY) || false) {
    try {
      const canvasElem = findCanvas()
      if (canvasElem) {
        // This sets up the main listener on the canvas
        // It keeps track of touches and handles pan/zoom gestures
        const touchPointerEventsManager = TouchPointerEventsManager.init(canvasElem)
        initMeasurementHud({ touchPointerEventsManager })

        // This gives the user a touch-friendly UI for pre-made templates (like from an automatic "Place Measured Template" chat button, or MidiQOL)
        measuredTemplateManager.initMeasuredTemplateHud(touchPointerEventsManager)

        // This fixes an issue in v11 where a pen pointerdown would register as a pen input and a pointer input, creating a double click
        if (game.release.generation < 12) {
          canvasElem.removeEventListener("pointerdown", canvas.app.renderer.events.onPointerDown, true)
          wrapMethod('canvas.app.renderer.events.onPointerDown', function(originalMethod, ...args) {
            if (args[0].pointerType == "pen") {
              return
            }
            return originalMethod.call(this, ...args)
          }, 'MIXED')
          canvasElem.addEventListener("pointerdown", canvas.app.renderer.events.onPointerDown, true)
        }

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
    ["pointerdown", "pointermove", "pointerup", "pointercancel", "touchstart", "touchmove", "touchend"].forEach(e => {
      document.body.addEventListener(e, evt => {
        console.log(MODULE_DISPLAY_NAME + ": " + evt.type, evt.pointerType, evt.isTrusted, evt)
      }, true)
    })
  }

})
