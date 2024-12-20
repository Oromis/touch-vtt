import {MODULE_NAME} from "../config/ModuleConstants"
import {wrapMethod} from "../utils/Injection"
import FoundryCanvas from "../foundryvtt/FoundryCanvas"
import Vectors from "../logic/Vectors.js"
import {getSetting, MEASUREMENT_HUD_LEFT, MEASUREMENT_HUD_OFF, MEASUREMENT_HUD_SETTING} from "../config/TouchSettings.js"

class TouchMeasurementHud extends Application {
  constructor({ touchPointerEventsManager }) {
    super()

    this._touchPointerEventsManager = touchPointerEventsManager
    this._worldPosition = null
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
    data.offsetX = this.calcOffsetX()
    data.showRuler = !Vectors.isEqual(this._worldPosition ?? {}, this.lastWaypoint)
    data.showMove = this.canMoveToken()
    data.showCancel = !!canvas.tokens._draggedToken
    return data
  }

  activateListeners(html) {
    const element = html[0] ?? html
    element.querySelector(".waypoint").addEventListener("pointerdown", (evt) => {
      if (canvas.tokens._draggedToken) {
        // This is the v13+ drag ruler
        const fakeEvent = new PIXI.FederatedEvent(evt)
        fakeEvent.ctrlKey = true
        foundry.utils.setProperty(fakeEvent, "interactionData.origin", this._worldPosition)
        canvas.tokens._draggedToken._onDragLeftClick(fakeEvent)
      } else {
        // Regular old ruler
        const ruler = FoundryCanvas.ruler
        if (ruler != null) {
          if (game.release.generation < 13) {
            ruler._addWaypoint(this._worldPosition)
          } else {
            ruler.path = [...ruler.path.slice(0, -1), this._worldPosition, this._worldPosition]
          }
          this.render()
        }
      }
    })

    element.querySelector(".move")?.addEventListener("pointerdown", () => {
      const ruler = FoundryCanvas.ruler
      if (ruler != null && typeof ruler.moveToken === "function") {
        const token = ruler.token || ruler._getMovementToken()
        token.document.locked = false
        ruler.moveToken()
        this.render()
      }
    })

    element.querySelector(".cancel")?.addEventListener("pointerdown", (evt) => {
      canvas.tokens._draggedToken.mouseInteractionManager.cancel()
    })
  }

  async show(worldPosition) {
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

  get lastWaypoint() {
    const ruler = FoundryCanvas.ruler
    if (game.release.generation <= 12) {
      return ruler?.waypoints.at(-1) ?? {}
    } else {
      return ruler?.path.at(-2) ?? {}
    }
  }

  canMoveToken() {
    if (game.release.generation >= 13) {
      // We just don't use the move button at all on v13+
      return false
    }

    const ruler = FoundryCanvas.ruler
    if (ruler == null) {
      return false
    }
    if (game.paused && !game.user.isGM) {
      return false
    }
    if (!ruler.visible || !ruler.destination) return false
    return ruler._getMovementToken(ruler.origin) != null
  }

  calcOffsetX() {
    const offset = FoundryCanvas.worldToScreenLength(FoundryCanvas.gridSize) * 0.75
    if (getSettingValue() === MEASUREMENT_HUD_LEFT) {
      return `calc(-100% - ${offset}px)`
    } else {
      return `${offset}px`
    }
  }
}

export function initDragRulerMeasurementHud() {
    wrapMethod("foundry.canvas.placeables.Token.prototype._onDragLeftMove", function (wrapped, ...args) {
      if (isEnabled() && document.body.classList.contains("touchvtt-using-touch")) {
        const event = args[0]
        const {destination} = event.interactionData
        canvas.hud.touchMeasurement.show(this.document.getSnappedPosition(destination))
      }
      else {
        canvas.hud.touchMeasurement.clear()
      }
      return wrapped.call(this, ...args)
    }, "MIXED")
    wrapMethod("foundry.canvas.placeables.Token.prototype._onDragLeftCancel", function (wrapped, ...args) {
      canvas.hud.touchMeasurement.clear()
      return wrapped.call(this, ...args)
    }, "MIXED")
}

export function initMeasurementHud({ touchPointerEventsManager }) {
  if (canvas.hud.touchMeasurement == null) {
    canvas.hud.touchMeasurement = new TouchMeasurementHud({ touchPointerEventsManager })
    const rulerPath = game.release.generation < 13 ? "Ruler" : "foundry.canvas.interaction.Ruler"

    wrapMethod(`${rulerPath}.prototype._onMouseMove`, function (wrapped, event, ...args) {
      // I think here we're storing "touch" or "mouse" somewhere in the interactionData so we can check it later
      if (event.interactionData != null && event.interactionData.destination != null) {
        if (game.release.generation < 12) {
          event.interactionData.destination.originType = event.pointerType
        } else {
          event.interactionData.destination.originType = event.data?.originalEvent?.pointerType
        }
      }
      return wrapped.call(this, event, ...args)
    })

    if (game.release.generation < 13) {
      wrapMethod(`${rulerPath}.prototype.measure`, function (wrapped, destination, ...args) {
        const segments = wrapped.call(this, destination, ...args)
        if (Array.isArray(segments) && isOwnRuler(this) && isEnabled() && destination?.originType === "touch") {
          if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1]
            canvas.hud.touchMeasurement.show(lastSegment.ray.B)
          } else {
            canvas.hud.touchMeasurement.clear()
          }
        }
        return segments
      })
    } else {
      wrapMethod(`${rulerPath}.prototype._onPathChange`, function (wrapped, ...args) {
        if (this.path.length > 0 && isOwnRuler(this) && isEnabled() && document.body.classList.contains("touchvtt-using-touch")) {
          canvas.hud.touchMeasurement.show(this.destination)
        } else {
          canvas.hud.touchMeasurement.clear()
        }
        return wrapped.call(this, ...args)
      })
    }

    wrapMethod(`${rulerPath}.prototype.clear`, function (wrapped, ...args) {
      const superResult = wrapped.call(this, ...args)
      if (isOwnRuler(this)) {
        canvas.hud.touchMeasurement.clear()
      }
      return superResult
    })
  }
}

function isOwnRuler(ruler) {
  return FoundryCanvas.ruler === ruler
}

function getSettingValue() {
  return getSetting(MEASUREMENT_HUD_SETTING)
}

function isEnabled() {
  return getSettingValue() !== MEASUREMENT_HUD_OFF
}
