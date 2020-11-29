import {injectMethodCondition, replaceMethod} from '../utils/Injection.js'

export function installMeasurementTemplateEraser(menuStructure) {
  const measurementCategory = menuStructure.find(c => c.name === 'measure')
  if (measurementCategory != null) {
    const clearIndex = measurementCategory.tools.findIndex(t => t.name === 'clear')
    if (clearIndex !== -1) {
      const TOOL_NAME_ERASE = 'erase'
      measurementCategory.tools.splice(clearIndex, 0, {
        name: TOOL_NAME_ERASE,
        title: 'TOUCHVTT.Erase',
        icon: 'fas fa-eraser'
      })

      const isEraserActive = () => game.activeTool === TOOL_NAME_ERASE
      const isEraserInactive = () => !isEraserActive()
      injectMethodCondition(TemplateLayer.prototype, '_onDragLeftStart', isEraserInactive)
      injectMethodCondition(TemplateLayer.prototype, '_onDragLeftMove', isEraserInactive)
      injectMethodCondition(TemplateLayer.prototype, '_onDragLeftDrop', isEraserInactive)
      injectMethodCondition(TemplateLayer.prototype, '_onDragLeftCancel', isEraserInactive)
      replaceMethod(MeasuredTemplate.prototype, '_onClickLeft', ({ callOriginal, self }) => {
        if (isEraserActive()) {
          self.delete()
        } else {
          callOriginal()
        }
      })
      injectMethodCondition(MeasuredTemplate.prototype, '_onClickLeft2', isEraserInactive)
      injectMethodCondition(MeasuredTemplate.prototype, '_onClickRight', isEraserInactive)
      injectMethodCondition(MeasuredTemplate.prototype, '_onClickRight2', isEraserInactive)
      injectMethodCondition(MeasuredTemplate.prototype, '_onDragLeftStart', isEraserInactive)
      injectMethodCondition(MeasuredTemplate.prototype, '_onDragLeftMove', isEraserInactive)
      injectMethodCondition(MeasuredTemplate.prototype, '_onDragLeftDrop', isEraserInactive)
      injectMethodCondition(MeasuredTemplate.prototype, '_onDragLeftCancel', isEraserInactive)
    }
  }
}
