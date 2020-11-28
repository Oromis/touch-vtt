import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import TouchContext from './TouchContext.js'
import Vectors from './Vectors.js'
import {dispatchFakeEvent} from './FakeTouchEvent.js'

class Touch {
  constructor(event, touchSource, { context = TouchContext.PRIMARY_CLICK } = {}) {
    this.id = touchSource.identifier
    this.start = Object.freeze({ x: touchSource.clientX, y: touchSource.clientY })
    this.last = this.start
    this.current = this.last
    this.context = context
    this.clientX = touchSource.clientX
    this.clientY = touchSource.clientY
    this.screenX = touchSource.screenX
    this.screenY = touchSource.screenY
    this.target = touchSource.target
    this.latestEvent = event

    this.world = FoundryCanvas.screenToWorld(this.current)  //< Position in the world where the user touched
    this.movementDistance = 0

    console.log(`New Touch, ID: ${this.id}, context: ${context.name}`)

    this.longPressTimeout = setTimeout(() => {
      // Long click detection: if the pointer hasn't moved considerably and if this is still the only touch point,
      // then we need to treat this as a right-click.
      if (this.movementDistance < 20 && this.context === TouchContext.PRIMARY_CLICK) {
        this.changeContext(TouchContext.SECONDARY_CLICK)
      }
      this.longPressTimeout = null
    }, 500)
  }

  get identifier() {
    return this.id
  }

  update(event, touchSource) {
    this.latestEvent = event
    this.last = this.current
    this.current = Object.freeze({ x: touchSource.clientX, y: touchSource.clientY })
    this.movementDistance += Vectors.distance(this.last, this.current)
  }

  changeContext(newContext) {
    if (this.context === TouchContext.ZOOM_PAN_GESTURE) {
      // A touch point that was used as a zoom gesture can never change its function back to a regular touch,
      // that would be confusing. The user needs to lift the finger and touch again (which is intuitive)
      return
    }
    if (this.context !== newContext) {
      console.log(`Changing touch from ${this.context.name} to ${newContext.name}`)
      if (this.context.forwardsEvent('touchend')) {
        dispatchFakeEvent(this.latestEvent, this, this.context.mouseButton, 'pointerup')
      }
      if (newContext.forwardsEvent('touchstart')) {
        dispatchFakeEvent(this.latestEvent, this, newContext.mouseButton, 'pointerdown')
      }
    }
    this.context = newContext
  }

  destroy() {
    if (this.longPressTimeout != null) {
      clearTimeout(this.longPressTimeout)
      this.longPressTimeout = null
    }
  }
}

export default Touch
