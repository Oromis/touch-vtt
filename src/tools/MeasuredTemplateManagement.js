import {MODULE_NAME} from '../config/ModuleConstants'
import FoundryCanvas from '../foundryvtt/FoundryCanvas'
import {injectMethodCondition, wrapMethod} from '../utils/Injection.js'
import {dispatchModifiedEvent} from '../logic/FakeTouchEvent.js'
import {getSetting, MEASUREMENT_HUD_LEFT, MEASUREMENT_HUD_OFF, MEASUREMENT_HUD_SETTING} from '../config/TouchSettings.js'

const TOOL_NAME_ERASE = 'erase'

class TouchMeasuredTemplateHud extends Application {
  constructor({ touchPointerEventsManager, templateManager }) {
    super()

    this._touchPointerEventsManager = touchPointerEventsManager
    this._templateManager = templateManager
    this._worldPosition = null
    this._screenPosition = {}
    this._currentTemplate = null
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "touch-measured-template-hud",
      template: `/modules/${MODULE_NAME}/templates/measured-template-hud.hbs`,
      popOut: false,
      width: 200,
      height: 100,
      left: 150,
      top: 80,
      scale: 1,
      minimizable: false,
      resizable: false,
      dragDrop: [],
      tabs: [],
      scrollY: [],
    })
  }

  getData(...args) {
    const data = super.getData(...args)
    data.id = this.options.id
    data.top = this._screenPosition.top
    data.left = this._screenPosition.left
    data.offsetX = this.calcOffsetX()
    data.showRotate = true
    data.showConfirm = true
    data.showCancel = true
    return data
  }

  activateListeners(html) {
    html.find('.rotate').on('pointerdown', () => {
      this._currentTemplate.document.updateSource({direction: this._currentTemplate.document.direction + 15})
      this._currentTemplate.refresh()
    })
    
    html.find('.confirm').on('pointerdown', () => {
      this._templateManager.toggleMeasuredTemplateTouchManagementListeners(false)
      this._templateManager._touchMode = false
      // We send mousedown/mouseup events to be as close as possible to the expected behavior
      canvas.app.view.dispatchEvent(new PointerEvent("pointerdown", {pointerType: "mouse", isPrimary: true, clientX: this._screenPosition.left, clientY: this._screenPosition.top, button: 0, buttons: 1}))
      canvas.app.view.dispatchEvent(new PointerEvent("pointerup", {pointerType: "mouse", isPrimary: true, clientX: this._screenPosition.left, clientY: this._screenPosition.top, button: 0, buttons: 1}))
      canvas.hud.touchMeasuredTemplate.clear()
    })

    html.find('.cancel').on('pointerdown', () => {
      this._templateManager.toggleMeasuredTemplateTouchManagementListeners(false)
      this._templateManager._touchMode = false
      canvas.app.view.dispatchEvent(new MouseEvent("contextmenu", {clientX: 0, clientY: 0, bubbles: true, cancelable: true, view: window, button: 2}))
      canvas.hud.touchMeasuredTemplate.clear()
    })
  }

  async show(template) {
    this._currentTemplate = template
    const worldPosition = {x: template.document.x, y: template.document.y}
    if (this._templateManager._touchMode) {
      this._worldPosition = worldPosition
      const screenPosition = FoundryCanvas.worldToScreen(worldPosition)
      this.setScreenPosition({
        left: screenPosition.x,
        top: screenPosition.y,
      })

      const states = this.constructor.RENDER_STATES
      await this.render(this._state <= states.NONE)

      this._touchPointerEventsManager.disableGestures()
    }
  }

  clear() {
    const states = this.constructor.RENDER_STATES
    if (this._state <= states.NONE) return
    this._state = states.CLOSING

    this.element.hide()
    this._state = states.NONE

    this._touchPointerEventsManager.enableGestures()
  }

  setScreenPosition({top, left}) {
    this._screenPosition = { top, left }
  }

  calcOffsetX() {
    const offset = FoundryCanvas.worldToScreenLength(FoundryCanvas.gridSize) * 0.75
    if (getSetting(MEASUREMENT_HUD_SETTING) === MEASUREMENT_HUD_LEFT) {
      return `calc(-100% - ${offset}px)`
    } else {
      return `${offset}px`
    }
  }
}

export class MeasuredTemplateManager {

  constructor() {
    this._touchMode = false
    this._touchEventReplacer = this.touchEventReplacer.bind(this)
  }

  
  initMeasuredTemplateHud(touchPointerEventsManager) {
    if (canvas.hud.touchMeasuredTemplate == null) {
      canvas.hud.touchMeasuredTemplate = new TouchMeasuredTemplateHud({ touchPointerEventsManager, templateManager: this })

      wrapMethod("MeasuredTemplate.prototype._applyRenderFlags", function(originalMethod, flags) {
        if (flags.refreshPosition) {
          canvas.hud.touchMeasuredTemplate.show(this)
        }
        return originalMethod.call(this, flags)
      })
    }
  }

  touchEventReplacer(evt) {
    // An event gets here if the listeners have been activated; we replace them all with pointermove until the template is confirmed
    if (evt.isTrusted || evt.touchvttTrusted) {
      if (evt instanceof TouchEvent || evt instanceof PointerEvent && (["touch", "pen"].includes(evt.pointerType) || evt.touchvttTrusted)) {
        this._touchMode = true
      } else {
        this._touchMode = false
        return this.toggleMeasuredTemplateTouchManagementListeners(false)
      }
    }
    if (this._touchMode && (evt.isTrusted || evt.touchvttTrusted) && evt.target.tagName == "CANVAS") {
      evt.preventDefault()
      evt.stopPropagation()
      if (evt instanceof PointerEvent) {
        dispatchModifiedEvent(evt, "pointermove", {trusted: false, button: -1, buttons: 0})
      }
      return false
    } else {
      return true
    }
  }

  toggleMeasuredTemplateTouchManagementListeners(activate = true) {
    // When active, we capture all relevant events to see if they need to be replaced
    if (activate) {
      ["pointerdown", "pointerup", "pointermove", "pointercancel", "touchstart", "touchmove", "touchend"].forEach(e => {
        window.document.addEventListener(e, this._touchEventReplacer, true)
      })
    } else {
      ["pointerdown", "pointerup", "pointermove", "pointercancel", "touchstart", "touchmove", "touchend"].forEach(e => {
        window.document.removeEventListener(e, this._touchEventReplacer, true)
      })
    }
  }

  onTemplatePreviewCreated(template) {
    if (this.isPremade(template)) {
      // This is a pre-made template that we want to place, so we activate our listeners
      this.toggleMeasuredTemplateTouchManagementListeners(true)
    }
  }

  initMeasuredTemplateManagement() {
    const isEraserActive = () => game.activeTool === TOOL_NAME_ERASE
    const shouldIgnoreEvent = () => !isEraserActive() && !this._touchMode

    injectMethodCondition('TemplateLayer.prototype._onDragLeftStart', shouldIgnoreEvent)
    injectMethodCondition('TemplateLayer.prototype._onDragLeftMove', shouldIgnoreEvent)
    injectMethodCondition('TemplateLayer.prototype._onDragLeftDrop', shouldIgnoreEvent)
    injectMethodCondition('TemplateLayer.prototype._onDragLeftCancel', shouldIgnoreEvent)

    wrapMethod('MeasuredTemplate.prototype._onClickLeft', function(callOriginal, ...args) {
      if (isEraserActive()) {
        this.document.delete()
        // v11 only: we dispatch a left click on the canvas because the template shape was lingering while dragging after the deletion
        if (game.release.generation < 12) {
          setTimeout(() => { canvas.app.view.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, view: window, button: 2})) }, 0)
        }
      } else {
        callOriginal(...args)
      }
    }, 'MIXED')    
  }

  isPremade(template) {
    // Explaining the condition here for future reference:
    // A pre-made template doesn't have an id, and has a distance already set, usually larger than half a square.
    // A template created by dragging triggers two draws: on dragStart, it doesn't have an id and has distance 1 (in v11) or half a square (in v12); on confirmation, it has an id, and has a set distance
    // When you move an existing template, it doesn't have an id, and it has a set distance
    const gridSize = game.release.generation < 12 ? canvas.grid.grid.options.dimensions.distance : canvas.grid.distance
    return !template.id && template.document.distance > gridSize
  }

}

MeasuredTemplateManager.init = function init() {
  return new MeasuredTemplateManager()
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
