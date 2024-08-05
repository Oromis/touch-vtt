import Touch from './Touch.js'
import {dispatchModifiedEvent} from "./FakeTouchEvent.js"

class TouchPointerEventsManager {
  constructor(element) {
    this.touches = {}
    const touchHandler = this.handleTouch.bind(this)
    for (const eventType of this.getListenerEvents()) {
      if (element instanceof HTMLElement) {
        element.addEventListener(eventType, touchHandler, this.getEventListenerOptions())
      } else {
        document.addEventListener(eventType, (event) => {
          //console.log(eventType, event)
          if (event.target.closest(element)) {
            touchHandler(event)
          }
        }, this.getEventListenerOptions())
      }
    }

    this._gesturesEnabled = true
  }

  preHandle(event) {}

  handleTouch(event) {

    if (!this.isTouchPointerEvent(event)) {
      return
    }

    this.preHandle(event)

    if (this.shouldHandleEvent(event)) {
      // shouldHandleEvent excludes our fake events at this time
      switch (event.type) {
        case 'pointerdown':
          this.handleTouchStart(event)
          break

        case 'pointermove':
          this.handleTouchMove(event)
          break

        case 'pointerup':
          this.handleTouchEnd(event)
          break
        
        case 'pointercancel':
          this.handleEndAll(event)
          break

        default:
          console.warn(`Unknown touch event type ${event.type}`)
          break
      }
    }
  }

  handleTouchStart(event) {
    this.updateActiveTouch(event)
    if (this.touchIds.length > 1) {
      // This is to cancel any drag-style action (usually a selection rectangle) when we start having multiple touches
      dispatchModifiedEvent(event, "pointerup")
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
      this.touches[id] = new Touch(event, event)
    }
  }

  cleanUpAll() {
    this.touches = {}
  }

  cleanUpTouch(event) {
    delete this.touches[event.pointerId]
  }

  getEventListenerOptions() {
    return {
      capture: true,
      passive: false,
    }
  }

  getListenerEvents() {
    return ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']
  }

  shouldHandleEvent(event) {
    return event.isTrusted
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
