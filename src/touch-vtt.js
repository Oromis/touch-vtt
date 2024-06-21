import {MODULE_DISPLAY_NAME} from './config/ModuleConstants.js'

import {wrapMethod} from './utils/Injection'

import CanvasTouchToMouseAdapter from './logic/CanvasTouchToMouseAdapter.js'
import WindowHeaderTouchToMouseAdapter from './logic/WindowHeaderTouchToMouseAdapter.js'

import '../style/touch-vtt.css'
import {registerTouchSettings} from './config/TouchSettings.js'
import {installMeasurementTemplateEraser, initMeasurementTemplateEraser} from './tools/MeasurementTemplateEraser.js'
import {callbackForWallTools, installWallToolsControls, initWallTools} from './tools/WallTools.js'
import {callbackForSnapToGrid, installSnapToGrid} from './tools/SnapToGridTool.js'
import {callbackForEasyTarget} from './logic/EasyTarget'
import {initDirectionalArrows} from './logic/DirectionalArrows'
import {initEnlargeButtonTool} from './tools/EnlargeButtonsTool'
import {installDrawingToolsControls} from './tools/DrawingTools'
import {initMeasurementHud} from './tools/MeasurementHud'

function findCanvas() {
  return document.querySelector('canvas#board') ||
    document.querySelector('body > canvas') ||
    document.querySelector('canvas')
}

console.log(`${MODULE_DISPLAY_NAME} booting ...`)

Hooks.on('getSceneControlButtons', (controls) => {
  installMeasurementTemplateEraser(controls)
  installWallToolsControls(controls)
  installDrawingToolsControls(controls)
  installSnapToGrid(controls)
})

Hooks.once('init', () => {
  registerTouchSettings()
  initEnlargeButtonTool()
  initDirectionalArrows()
  initMeasurementTemplateEraser()
  initWallTools()

  // This wrap gives us control over every MouseInteractionManager
  wrapMethod('MouseInteractionManager.prototype.callback', async function (originalMethod, event, ...args) {
    
    // v12 only: ugly patch to fix annoying issue in v12 where a double-click that opens a sheet also sends one of the clicks to an active listener on the sheet.
    // For example, you open an actor sheet, if something clickable is under your finger (icon, action, ability, etc.) it will get wrongly clicked.
    // What we do here is delay the sheet rendering a little bit, and also dispatch a right click on the canvas to avoid a lingering drag select on the placeable.
    if (parseInt(game.version) >= 12) {
      if (event == "clickLeft2") {
        await new Promise(resolve => setTimeout(resolve, 100))
        document.getElementById("board").dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, view: window, button: 2}))
        return originalMethod.call(this, event, ...args)
      }
    }
    
    callbackForEasyTarget(event, args)
    callbackForSnapToGrid(event, args)
    return originalMethod.call(this, event, ...args)
  }, 'MIXED')

  // This wrap is used for wall chaining: when the chain button is active, pretend we are holding Ctrl
  wrapMethod('game.keyboard.isModifierActive', function(originalMethod, modifier) {
    var result = originalMethod.call(this, modifier)
    result ||= callbackForWallTools(modifier)
    return result
  }, 'MIXED')
})

Hooks.on('ready', function () {
  try {
    const canvas = findCanvas()
    if (canvas) {
      // This sets up the main listener on the canvas
      // For v11, this translates and adapts a lot of touch events into mouse events
      // For v12, it's mostly just tracking touches and handling pan/zoom (I think), and is also used by the measurement HUD
      const canvasTouchToMouseAdapter = CanvasTouchToMouseAdapter.init(canvas)
      
      initMeasurementHud({ canvasTouchToMouseAdapter })
      WindowHeaderTouchToMouseAdapter.init(document.body)
      console.info(`${MODULE_DISPLAY_NAME} started successfully.`)
    } else {
      console.warn(`Failed to find canvas element. ${MODULE_DISPLAY_NAME} will not be available.`)
    }
  } catch (e) {
    console.error(`Failed to initialize ${MODULE_DISPLAY_NAME}: `, e)
  }
})
