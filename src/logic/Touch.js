import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import TouchContext from './TouchContext.js'
import Vectors from './Vectors.js'
import {dispatchFakeEvent} from './FakeTouchEvent.js'
import {idOf} from '../utils/EventUtils.js'

class Touch {
  constructor(event, touch, { context = TouchContext.PRIMARY_CLICK } = {}) {
    this.id = idOf(event)
    this.start = Object.freeze({ x: touch.clientX, y: touch.clientY })
    this.last = this.start
    this.current = this.last
    this.context = context
    this.clientX = touch.clientX
    this.clientY = touch.clientY
    this.screenX = touch.screenX
    this.screenY = touch.screenY
    this.target = event.target
    this.latestEvent = event

    this.world = FoundryCanvas.screenToWorld(this.current)  //< Position in the world where the user touched
    this.movementDistance = 0
    this.movement = Vectors.zero

    // console.log(`New Touch: ${context.name}, ID ${this.id}`)
    this.longPressTimeout = setTimeout(() => {
      // Long click detection: if the pointer hasn't moved considerably and if this is still the only touch point,
      // then we need to treat this as a right-click.
      if (this.movementDistance < 20 && this.context === TouchContext.PRIMARY_CLICK) {
        this.changeContext(TouchContext.SECONDARY_CLICK)
      }
      this.longPressTimeout = null
    }, 300)

    this.pingTimeout = setTimeout(() => {
      // Like the previous one, but to force a ping at location (seems to be missed otherwise)
      if (this.movementDistance < 20 && this.context === TouchContext.SECONDARY_CLICK) {
        canvas.ping(this.world)
      }
      this.pingTimeout = null
    }, 1000)
  }

  get identifier() {
    return this.id
  }

  update(event, touch) {
    this.latestEvent = event
    this.last = this.current
    this.current = Object.freeze({ x: touch.clientX, y: touch.clientY })
    this.movementDistance += Vectors.distance(this.last, this.current)
    this.movement = Vectors.add(this.movement, Vectors.subtract(this.current, this.last))
  }

  changeContext(newContext) {
    if (this.context.isFinal) {
      // A touch point that was used as a right click or a zoom gesture can never change its function back to a
      // regular touch, that would be confusing. The user needs to lift the finger and touch again (which is intuitive)
      return
    }
    if (this.context !== newContext) {
      // console.log(`Changing touch from ${this.context.name} to ${newContext.name}`)
      if (this.context.forwardsEvent('pointerup')) {
        dispatchFakeEvent(this.latestEvent, this, this.context.mouseButton, 'pointerup')
      }
      if (newContext.forwardsEvent('pointerdown')) {
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
    if (this.pingTimeout != null) {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = null
    }
  }
}

export default Touch
