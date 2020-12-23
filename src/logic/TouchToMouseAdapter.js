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
    element.addEventListener('pointerdown', touchHandler, this.getEventListenerOptions())
    element.addEventListener('pointermove', touchHandler, this.getEventListenerOptions())
    element.addEventListener('pointerup', touchHandler, this.getEventListenerOptions())
    element.addEventListener('pointercancel', touchHandler, this.getEventListenerOptions())
  }


  // The full touch handler with multi-touch pinching and panning support
  handleTouch(event) {
    if(event.pointerType != "touch") 
      return

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
    // touchend or touchcancel
    this.forwardTouches(event, Object.values(this.touches))
    this.cleanUpTouches(event)
    this.touches = {}
  }

  forwardTouches(event, touches) {

    for (const touch of Object.values(this.touches)) {
      const touchInstance = this.getTouch(touch.identifier)
      if (touchInstance != null) {
        if (touchInstance.context.forwardsEvent(event)) {
          fakeTouchEvent(event, touch, touchInstance.context.mouseButton, this.getEventTarget(event))
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
