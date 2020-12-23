import Touch from './Touch.js'
import TouchContext from './TouchContext.js'
import {fakeTouchEvent} from './FakeTouchEvent.js'

class TouchToMouseAdapter {
  constructor(element) {
    this.touches = {}

    const touchHandler = this.handleTouch.bind(this)
    for (const eventType of Object.keys(this.getEventMap())) {
      element.addEventListener(eventType, touchHandler, this.getEventListenerOptions())
    }
  }

  // The full touch handler with multi-touch pinching and panning support
  handleTouch(event) {
    if(event.pointerType !== "touch") {
      return
    }

    if (this.shouldHandleEvent(event)) {
      switch (event.type) {
        case 'pointerdown':
          this.handleTouchStart(event)
          break

        case 'pointermove':
          this.handleTouchMove(event)
          break

        case 'pointerup':
        case 'pointercancel':
          this.handleTouchEnd(event)
          break

        default:
          console.warn(`Unknown touch event type ${event.type}`)
          break
      }

      event.preventDefault()
    }
  }

  handleTouchStart(event) {
    this.updateActiveTouches(event)
    this.forwardTouches(event)
  }

  handleTouchMove(event) {
    this.updateActiveTouches(event)
    this.forwardTouches(event)
  }

  handleTouchEnd(event) {
    this.forwardTouches(event)
    this.cleanUpTouches(event)
    this.touches = {}
  }

  forwardTouches(event) {
    for (const touch of Object.values(this.touches)) {
      const touchInstance = this.getTouch(touch.identifier)
      if (touchInstance != null) {
        if (touchInstance.context.forwardsEvent(event)) {
          fakeTouchEvent(event, touch, touchInstance.context.mouseButton, this.getEventMap(), this.getEventTarget(event))
        }
      } else {
        console.warn(`Found no touch instance for ID ${touch.identifier}`, this.touches)
      }
    }
  }

  updateActiveTouches(event) {
    const context = TouchContext.PRIMARY_CLICK
    if (this.touches[event.pointerId] != null) {
      this.touches[event.pointerId].update(event)
      this.touches[event.pointerId].changeContext(context)
    } else {
      this.touches[event.pointerId] = new Touch(event, { context })
    }

  }

  cleanUpTouches(event) {
    delete this.touches[event.pointerId]
  }

  getTouchContextByTouches() {
    return TouchContext.PRIMARY_CLICK
  }

  getEventMap() {
    return {
      pointerdown: ['pointerdown'],
      pointermove: ['pointermove'],
      pointerup: ['pointerup'],
      pointercancel: ['pointercancel'],
    }
  }

  getTouch(id) {
    return this.touches[id]
  }

  getEventListenerOptions() {
    return {
      capture: true,
      passive: false,
    }
  }

  getEventTarget() {
    return null // pick the same target as the original event
  }

  shouldHandleEvent() {
    return true
  }
}

TouchToMouseAdapter.init = function init(element) {
  return new TouchToMouseAdapter(element)
}

export default TouchToMouseAdapter
