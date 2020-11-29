import {MODULE_NAME} from './config/ModuleConstants.js'
import CanvasTouchToMouseAdapter from './logic/CanvasTouchToMouseAdapter.js'
import WindowHeaderTouchToMouseAdapter from './logic/WindowHeaderTouchToMouseAdapter.js'

import '../style/touch-vtt.css'
import {injectMethodCondition, replaceMethod} from './utils/Injection.js'
import {installMeasurementTemplateEraser} from './tools/MeasurementTemplateEraser.js'

function findCanvas() {
  return document.querySelector('canvas#board') ||
    document.querySelector('body > canvas') ||
    document.querySelector('canvas')
}

console.log(`${MODULE_NAME} booting ...`)

Hooks.on('getSceneControlButtons', (controls) => {
  installMeasurementTemplateEraser(controls)
})

Hooks.on('ready', function () {
  const canvas = findCanvas()
  if (canvas) {
    CanvasTouchToMouseAdapter.init(canvas)
    WindowHeaderTouchToMouseAdapter.init(document.body)
    console.info(`${MODULE_NAME} started successfully.`)
  } else {
    console.warn(`Failed to find canvas element. ${MODULE_NAME} will not be available.`)
  }
})
