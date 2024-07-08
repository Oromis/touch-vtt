import {injectMethodCondition, wrapMethod} from '../utils/Injection.js'

const TOOL_NAME_ERASE = 'erase'

export function initMeasurementTemplateEraser() {
  const isEraserActive = () => game.activeTool === TOOL_NAME_ERASE
  const isEraserInactive = () => !isEraserActive()
  injectMethodCondition('TemplateLayer.prototype._onDragLeftStart', isEraserInactive)
  injectMethodCondition('TemplateLayer.prototype._onDragLeftMove', isEraserInactive)
  injectMethodCondition('TemplateLayer.prototype._onDragLeftDrop', isEraserInactive)
  injectMethodCondition('TemplateLayer.prototype._onDragLeftCancel', isEraserInactive)
  wrapMethod('MeasuredTemplate.prototype._onClickLeft', function(callOriginal, ...args) {
    if (isEraserActive()) {
      this.document.delete()
      // v11 only: we dispatch a left click on the canvas because the template shape was lingering while dragging after the deletion
      if (game.release.generation < 12) {
        setTimeout(() => { document.getElementById("board").dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, view: window, button: 2})) }, 0)
      }
    } else {
      callOriginal(...args)
    }
  }, 'MIXED')
  injectMethodCondition('MeasuredTemplate.prototype._onClickLeft2', isEraserInactive)
  injectMethodCondition('MeasuredTemplate.prototype._onClickRight', isEraserInactive)
  injectMethodCondition('MeasuredTemplate.prototype._onClickRight2', isEraserInactive)
  injectMethodCondition('MeasuredTemplate.prototype._onDragLeftStart', isEraserInactive)
  injectMethodCondition('MeasuredTemplate.prototype._onDragLeftMove', isEraserInactive)
  injectMethodCondition('MeasuredTemplate.prototype._onDragLeftDrop', isEraserInactive)
  injectMethodCondition('MeasuredTemplate.prototype._onDragLeftCancel', isEraserInactive)
}

export function installMeasurementTemplateEraser(menuStructure) {
  const measurementCategory = menuStructure.find(c => c.name === 'measure')
  if (measurementCategory != null) {
    const clearIndex = measurementCategory.tools.findIndex(t => t.name === 'clear')
    if (clearIndex !== -1) {
      measurementCategory.tools.splice(clearIndex, 0, {
        name: TOOL_NAME_ERASE,
        title: 'TOUCHVTT.Erase',
        icon: 'fas fa-eraser'
      })
    }
  }
}
