import {MODULE_DISPLAY_NAME} from './config/ModuleConstants.js'
import CanvasTouchToMouseAdapter from './logic/CanvasTouchToMouseAdapter.js'
import WindowHeaderTouchToMouseAdapter from './logic/WindowHeaderTouchToMouseAdapter.js'

import '../style/touch-vtt.css'
import {installMeasurementTemplateEraser, initMeasurementTemplateEraser} from './tools/MeasurementTemplateEraser.js'
import {initWallTools, installWallToolsControls} from './tools/WallTools.js'
import {registerTouchSettings} from './config/TouchSettings.js'
import {installSnapToGrid} from './tools/SnapToGridTool.js'
import {initDirectionalArrows} from './logic/DirectionalArrows'
import {initEnlargeButtonTool} from './tools/EnlargeButtonsTool'
import {installDrawingToolsControls} from './tools/DrawingTools'
import {initEasyTarget} from './logic/EasyTarget'
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
  initEasyTarget()
})

function _logoClicked() {
  var elem = $("body.vtt")[0];
  var d = document;
  var isFullScreen = (d.fullscreenElement && d.fullscreenElement !== null) || (d.mozFullScreenElement && d.mozFullScreenElement !== null) || (d.webkitFullscreenEnabled && d.webkitFullscreenElement !== null)
      || (d.msFullscreenElement && d.msFullscreenElement !== null);
  if (!isFullScreen) {
      if (elem.requestFullScreen) {
          elem.requestFullScreen();
      } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullScreen) {
          elem.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
      } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
      }
  } else {
      if (d.cancelFullScreen) {
          d.cancelFullScreen();
      } else if (d.mozCancelFullScreen) {
          d.mozCancelFullScreen();
      } else if (d.webkitCancelFullScreen) {
          d.webkitCancelFullScreen();
      } else if (d.msExitFullscreen) {
          d.msExitFullscreen();
      }
  }
}
Hooks.on('ready', () => {
  $("img#logo").click(_logoClicked);
});

Hooks.on('ready', function () {
  try {
    const canvas = findCanvas()
    if (canvas) {
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
