import Touch from './Touch.js'
import TouchContext from './TouchContext.js'
import {fakeTouchEvent} from './FakeTouchEvent.js'
import {idOf} from '../utils/EventUtils.js'

class TouchToMouseAdapter {
  constructor(element) {
    this.touches = {}

    const touchHandler = this.handleTouch.bind(this)
    for (const eventType of Object.keys(this.getEventMap())) {
      element.addEventListener(eventType, touchHandler, this.getEventListenerOptions())
    }
  }

  handleTouch(event) {
    if(!this.isTouchEvent(event)) {
      return
    }

    if (this.shouldHandleEvent(event)) {
      switch (event.type) {
        case 'pointerdown':
        case 'touchstart':
          console.log(`Native ${event.type} ${idOf(event)}`)
          this.handleTouchStart(event)
          break

        case 'pointermove':
        case 'touchmove':
          this.handleTouchMove(event)
          break

        case 'pointerup':
        case 'pointercancel':
          console.log(`Native ${event.type} ${idOf(event)}`)
          this.handleTouchEnd(event)
          break

        case 'touchend':
        case 'touchcancel':
          this.handleEndAll(event)
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
  }

  handleEndAll(event) {
    for (const touch of Object.values(this.touches)) {
      this.forwardTouch(event, touch)
    }
    this.cleanUpAll()
  }

  forwardTouches(event) {
    const touchInstance = this.getTouch(idOf(event))
    if (touchInstance != null) {
      this.forwardTouch(event, touchInstance)
    } else {
      console.warn(`Found no touch instance for ID ${idOf(event)} while trying to forward a ${event.type}`, this.touches)
    }
  }

  forwardTouch(event, touch) {
    if (touch.context.forwardsEvent(event)) {
      fakeTouchEvent(event, touch, touch.context.mouseButton, this.getEventMap(), this.getEventTarget(event))
    }
  }

  updateActiveTouches(event) {
    const context = this.getTouchContextByTouches(event)
    if (event.pointerId != null) {
      this.updateActiveTouch(event.pointerId, event, event, context)
    } else {
      for (const touch of event.touches) {
        this.updateActiveTouch(touch.identifier, event, touch, context)
      }
    }
  }

  updateActiveTouch(id, event, touch, context) {
    if (this.touches[id] != null) {
      this.touches[id].update(event, touch)
      this.touches[id].changeContext(context)
    } else {
      this.touches[id] = new Touch(event, touch, { context })
    }
  }

  cleanUpAll() {
    Object.keys(this.touches).forEach(id => this.cleanUpTouch(id))
  }

  cleanUpTouches(event) {
    const id = idOf(event)
    return this.cleanUpTouch(id)
  }

  cleanUpTouch(id) {
    const touch = this.touches[id]
    if (touch != null) {
      console.log(`Destroying touch ${touch.identifier} (${touch.context.name})`)
      touch.destroy()
    }
    delete this.touches[id]
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

  isTouchEvent(event) {
    return event.pointerType === "touch" || event instanceof TouchEvent
  }
}

TouchToMouseAdapter.init = function init(element) {
  return new TouchToMouseAdapter(element)
}

export default TouchToMouseAdapter
