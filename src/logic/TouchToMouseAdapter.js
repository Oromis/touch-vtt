import Touch from './Touch.js'
import TouchContext from './TouchContext.js'
import {fakeTouchEvent} from './FakeTouchEvent.js'

function findTouch(touchList, predicate) {
  for (const touch of touchList) {
    if (predicate(touch)) {
      return touch
    }
  }
  return null
}

class TouchToMouseAdapter {
  constructor(element) {
    this.touches = {}

    const touchHandler = this.handleTouch.bind(this)
    element.addEventListener('touchstart', touchHandler, this.getEventListenerOptions())
    element.addEventListener('touchmove', touchHandler, this.getEventListenerOptions())
    element.addEventListener('touchend', touchHandler, this.getEventListenerOptions())
    element.addEventListener('touchcancel', touchHandler, this.getEventListenerOptions())
  }

  // The full touch handler with multi-touch pinching and panning support
  handleTouch(event) {
    if (this.shouldHandleEvent(event)) {
      switch (event.type) {
        case 'touchstart':
          console.log(event.type)
          this.handleTouchStart(event)
          break

        case 'touchmove':
          this.handleTouchMove(event)
          break

        case 'touchend':
        case 'touchcancel':
          console.log(event.type)
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
    // touchend or touchcancel
    this.forwardTouches(event, Object.values(this.touches))
    this.cleanUpTouches(event.touches)
    this.touches = {}
  }

  forwardTouches(event, touches) {
    if (!Array.isArray(touches)) {
      touches = event.changedTouches
    }

    for (const touch of touches) {
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
    const context = this.getTouchContextByTouches(event.touches)
    for (const touch of event.touches) {
      if (this.touches[touch.identifier] != null) {
        this.touches[touch.identifier].update(event, touch)
        this.touches[touch.identifier].changeContext(context)
      } else {
        this.touches[touch.identifier] = new Touch(event, touch, { context })
      }
    }
    this.cleanUpTouches(event.touches)
  }

  cleanUpTouches(activeTouches) {
    const storedTouches = Object.values(this.touches)
    const markedForRemoval = []
    for (const storedTouch of storedTouches) {
      if (findTouch(activeTouches, activeTouch => activeTouch.identifier === storedTouch.identifier) == null) {
        // Touch is no longer active => kill it
        storedTouch.destroy()
        markedForRemoval.push(storedTouch)
      }
    }

    for (const toRemove of markedForRemoval) {
      delete this.touches[toRemove.identifier]
    }
  }

  getTouchContextByTouches() {
    return TouchContext.PRIMARY_CLICK
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

  getEventMap() {
    return {
      touchstart: ['mousedown'],
      touchmove: ['mousemove'],
      touchend: ['mouseup'],
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
