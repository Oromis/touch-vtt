import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Touch from './Touch.js'
import Vectors from './Vectors.js'
import Screen from '../browser/Screen.js'
import MathUtils from '../utils/MathUtils.js'
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
  constructor(canvas) {
    this.touches = {}

    const touchHandler = this.handleTouch.bind(this)
    canvas.addEventListener('touchstart', touchHandler, true)
    canvas.addEventListener('touchmove', touchHandler, true)
    canvas.addEventListener('touchend', touchHandler, true)
    canvas.addEventListener('touchcancel', touchHandler, true)
  }

  // The full touch handler with multi-touch pinching and panning support
  handleTouch(event) {
    if (event.type === 'touchstart' || event.type === 'touchmove') {
      if (event.type === 'touchmove') {
        this.handleTouchMove(event)
      } else {
        this.handleTouchStart(event)
      }
    } else {
      this.handleTouchEnd(event)
    }

    event.preventDefault()
  }

  handleTouchStart(event) {
    const context = this.getTouchContextByTouches(event.touches)
    for (const touch of event.touches) {
      this.touches[touch.identifier] = new Touch(event, touch, { context })
    }

    this.forwardTouches(event)
  }

  handleTouchMove(event) {
    const context = this.getTouchContextByTouches(event.touches)
    for (const touch of event.touches) {
      if (this.touches[touch.identifier] != null) {
        this.touches[touch.identifier].update(event, touch)
        if (this.touches[touch.identifier].context === TouchContext.PRIMARY_CLICK && context === TouchContext.ZOOM_PAN_GESTURE) {
          this.touches[touch.identifier].changeContext(context)
        }
      } else {
        this.touches[touch.identifier] = new Touch(event, touch, { context })
      }
    }
    this.cleanUpTouches(event.touches)

    if (event.touches.length === 2 && Object.keys(this.touches).length === 2) {
      // Two-finger touch move
      this.handleTwoFingerGesture(event)
    }

    this.forwardTouches(event)
  }

  handleTwoFingerGesture(event) {
    const firstId = event.touches[0].identifier
    const secondId = event.touches[1].identifier

    const zoomVector = Vectors.divideElements(
      Vectors.subtract(this.touches[firstId].current, this.touches[secondId].current),
      Vectors.subtract(this.touches[firstId].world, this.touches[secondId].world),
    )
    const zoomAfter = (zoomVector.x + zoomVector.y) / 2

    let panCorrection = Vectors.zero
    if (MathUtils.roundToDecimals(zoomAfter, 2) === FoundryCanvas.worldTransform.a) {
      const adjustedTransform = FoundryCanvas.getWorldTransformWith({ zoom: zoomAfter }, { discrete: true })
      // const touchedPointOnWorldBefore = FoundryCanvas.screenToWorld(this.touches[firstId].last)
      const correctionA = this.calcPanCorrection(adjustedTransform, this.touches[firstId])
      const correctionB = this.calcPanCorrection(adjustedTransform, this.touches[secondId])
      panCorrection = Vectors.centerBetween(correctionA, correctionB)
    }
    const centerBefore = FoundryCanvas.screenToWorld(Screen.center)
    const worldCenter = Vectors.subtract(centerBefore, panCorrection)

    // console.log(`Zooming to ${zoomAfter}, Center: `, worldCenter)
    FoundryCanvas.pan({
      x: worldCenter.x,
      y: worldCenter.y,
      zoom: zoomAfter
    })
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
          fakeTouchEvent(event, touch, touchInstance.context.mouseButton)
        }
      } else {
        console.warn(`Found no touch instance for ID ${touch.identifier}`, this.touches)
      }
    }
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

  calcPanCorrection(transform, touch) {
    const touchedPointOnWorldAfter = transform.applyInverse(touch.current)
    return Vectors.subtract(touchedPointOnWorldAfter, touch.world)
  }

  getTouchContextByTouches(touches) {
    return touches.length >= 2 ? TouchContext.ZOOM_PAN_GESTURE : TouchContext.PRIMARY_CLICK
  }

  getTouch(id) {
    return this.touches[id]
  }
}

TouchToMouseAdapter.init = function init(canvas) {
  return new TouchToMouseAdapter(canvas)
}

export default TouchToMouseAdapter
