import {MODULE_DISPLAY_NAME} from "../config/ModuleConstants.js"
import {getSetting, DEBUG_MODE_SETTING} from "../config/TouchSettings.js"
import Touch from "./Touch.js"

class TouchPointerEventsManager {
  constructor(element) {
    this.touches = {}
    const touchHandler = this.handleTouch.bind(this)
    for (const eventType of this.getListenerEvents()) {
      if (element instanceof HTMLElement) {
        element.addEventListener(eventType, touchHandler, this.getEventListenerOptions())
      } else {
        document.addEventListener(eventType, (event) => {
          if (event.target.closest(element)) {
            touchHandler(event)
          }
        }, this.getEventListenerOptions())
      }
    }

    this._gesturesEnabled = true
  }

  preHandleAll(event) {}

  preHandleTouch(event) {}

  handleTouch(event) {
    const preLength = this.touchIds.length

    this.preHandleAll(event)

    if (!this.isTouchPointerEvent(event)) {
      return
    }

    this.preHandleTouch(event)

    if (this.shouldHandleEvent(event)) {
      // shouldHandleEvent excludes our fake events at this time
      switch (event.type) {
        case "pointerdown":
          this.handleTouchStart(event)
          break

        case "pointermove":
          this.handleTouchMove(event)
          break

        case "pointerup":
          this.handleTouchEnd(event)
          //this.handleEndAll(event)
          break
        
        case "pointercancel":
          this.handleEndAll(event)
          break

        default:
          console.warn(`Unknown touch event type ${event.type}`)
          break
      }
    }
    if (preLength != this.touchIds.length && getSetting(DEBUG_MODE_SETTING)) {
      console.log(MODULE_DISPLAY_NAME + ": touches changed: " + preLength + " -> " + this.touchIds.length)
    }
  }

  onStartMultiTouch(event) {

  }

  onTouchAdded(event) {

  }

  onTouchRemoved(event) {

  }

  handleTouchStart(event) {
    const prevTouches = this.touchIds.length
    this.updateActiveTouch(event)
    if (prevTouches <= 1 && this.touchIds.length > 1) {
      this.onStartMultiTouch(event)
    }
  }

  handleTouchEnd(event) {
    this.cleanUpTouch(event)
  }

  handleEndAll(event) {
    this.cleanUpAll()
  }

  handleTouchMove(event) {
    this.updateActiveTouch(event)
  }

  updateActiveTouch(event) {
    var id = event.pointerId
    if (this.touches[id] != null) {
      this.touches[id].update(event, event)
    } else {
      if (event.type == "pointerdown" && event.buttons == 1 && event.pointerType != "pen") {
        this.touches[id] = new Touch(event, event)
        this.onTouchAdded(event)
      }
    }
  }

  cleanUpAll() {
    this.touches = {}
    this.onTouchRemoved(event)
  }

  cleanUpTouch(event) {
    delete this.touches[event.pointerId]
    this.onTouchRemoved(event)
  }

  getEventListenerOptions() {
    return {
      capture: true,
      passive: false,
    }
  }

  getListenerEvents() {
    return ["pointerdown", "pointermove", "pointerup", "pointercancel"]
  }

  shouldHandleEvent(event) {
    return event.isTrusted || event.touchvttTrusted
  }

  isTouchPointerEvent(event) {
    return event instanceof PointerEvent && ["touch", "pen"].includes(event.pointerType)
  }

  get touchIds() {
    return Object.keys(this.touches)
  }

  disableGestures() {
    this._gesturesEnabled = false
  }

  enableGestures() {
    this._gesturesEnabled = true
  }

  gesturesEnabled() {
    return this._gesturesEnabled
  }
}

TouchPointerEventsManager.init = function init(element) {
  return new TouchPointerEventsManager(element)
}

export default TouchPointerEventsManager
