import {MODULE_NAME} from './config/ModuleConstants.js'
import TouchToMouseAdapter from './logic/TouchToMouseAdapter.js'

function findCanvas() {
  return document.querySelector('canvas#board') ||
    document.querySelector('body > canvas') ||
    document.querySelector('canvas')
}

console.log(`${MODULE_NAME} booting ...`)

Hooks.on('ready', function () {
  const canvas = findCanvas()
  if (canvas) {
    TouchToMouseAdapter.init(canvas)
    console.info(`${MODULE_NAME} started successfully.`)
  } else {
    console.warn(`Failed to find canvas element. ${MODULE_NAME} will not be available.`)
  }
})
