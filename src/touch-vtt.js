import {MODULE_DISPLAY_NAME} from './config/ModuleConstants.js'

import {wrapMethod} from './utils/Injection'

import TouchPointerEventsManager from './logic/TouchPointerEventsManager.js'
import WindowAppAdapter from './logic/WindowAppAdapter.js'
import {dispatchModifiedEvent} from './logic/FakeTouchEvent.js'

import '../style/touch-vtt.css'
import {registerTouchSettings, getSetting, CORE_FUNCTIONALITY} from './config/TouchSettings.js'
import {installMeasurementTemplateEraser, initMeasurementTemplateEraser} from './tools/MeasurementTemplateEraser.js'
import {callbackForWallTools, installWallToolsControls, initWallTools} from './tools/WallTools.js'
import {callbackForSnapToGrid, installSnapToGrid} from './tools/SnapToGridTool.js'
import {installTokenEraser} from './tools/TokenEraserTool.js'
import {callbackForEasyTarget} from './logic/EasyTarget'
import {initDirectionalArrows} from './logic/DirectionalArrows'
import {initEnlargeButtonTool} from './tools/EnlargeButtonsTool'
import {installDrawingToolsControls} from './tools/DrawingTools'
import {initMeasurementHud} from './tools/MeasurementHud'
import {installUtilityControls} from './tools/UtilityControls'

function findCanvas() {
  return document.querySelector('canvas#board') ||
    document.querySelector('body > canvas') ||
    document.querySelector('canvas')
}

var canvasRightClickTimeout = null

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

    initEnlargeButtonTool()
    initDirectionalArrows()
    initMeasurementTemplateEraser()
    initWallTools()

    // We want a longer long press on our MouseInteractionManagers, we will use a shorter one for faking a right-click
    MouseInteractionManager.LONG_PRESS_DURATION_MS = 1000

    // This wrap gives us control over every MouseInteractionManager
    wrapMethod('MouseInteractionManager.prototype.callback', async function (originalMethod, event, ...args) {
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

        // This is for sending a right click on long press (doesn't happen by default on the canvas)
        if (event == "clickLeft") {
          clearTimeout(canvasRightClickTimeout)
          canvasRightClickTimeout = setTimeout(() => {
            dispatchModifiedEvent(args[0], "pointerdown", {button: 2, buttons: 2})
          }, 400)
        } else {
          clearTimeout(canvasRightClickTimeout)
        }
        
        callbackForEasyTarget(event, args)
        callbackForSnapToGrid(event, args)
      
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
    const windowAppAdapter = WindowAppAdapter.init()

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
    } catch (e) {
      console.error(`Failed to initialize ${MODULE_DISPLAY_NAME}: `, e)
    }
  }
})
