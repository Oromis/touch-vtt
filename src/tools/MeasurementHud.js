import {MODULE_NAME} from '../config/ModuleConstants'
import {wrapMethod} from '../utils/Injection'
import FoundryCanvas from '../foundryvtt/FoundryCanvas'

class TouchMeasurementHud extends Application {
  constructor() {
    super()

    this._screenPosition = {}
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "touch-measurement-hud",
      template: `/modules/${MODULE_NAME}/templates/measurement-hud.hbs`,
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
    data.offsetX = FoundryCanvas.worldToScreenLength(FoundryCanvas.gridSize) * 0.75
    return data
  }

  async show(worldPosition) {
    const screenPosition = FoundryCanvas.worldToScreen(worldPosition)
    this.setScreenPosition({
      left: screenPosition.x,
      top: screenPosition.y,
    })

    const states = this.constructor.RENDER_STATES
    if (this._state <= states.NONE) {
      await this.render(true)
    } else {
      await this.render(true)
    }
  }

  clear() {
    const states = this.constructor.RENDER_STATES
    if (this._state <= states.NONE) return
    this._state = states.CLOSING

    this.element.hide()
    this._state = states.NONE
  }

  setScreenPosition({top, left}) {
    this._screenPosition = { top, left }
  }
}

export function initMeasurementHud() {
  if (canvas.hud.touchMeasurement == null) {
    canvas.hud.touchMeasurement = new TouchMeasurementHud()

    wrapMethod('Ruler.prototype.measure', function (wrapped, ...args) {
      const segments = wrapped.call(this, ...args)
      if (Array.isArray(segments) && segments.length > 0) {
        const lastSegment = segments[segments.length - 1]
        canvas.hud.touchMeasurement.show(lastSegment.ray.B)
      } else {
        canvas.hud.touchMeasurement.clear()
      }
      return segments
    })

    wrapMethod('Ruler.prototype.clear', function (wrapped, ...args) {
      const superResult = wrapped.call(this, ...args)
      canvas.hud.touchMeasurement.clear()
      return superResult
    })
  }
}
