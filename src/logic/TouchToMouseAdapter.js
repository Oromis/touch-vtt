import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Touch from './Touch.js'
import Vectors from './Vectors.js'
import Screen from '../browser/Screen.js'
import MathUtils from '../utils/MathUtils.js'
import TouchContext from './TouchContext.js'
import MouseButton from './MouseButton.js'

function bitCodeMouseButton(button) {
  switch (button) {
    case 0:
      return 1  // Primary (left) mouse button
    case 1:
      return 4  // Auxiliary (middle) mouse button
    case 2:
      return 2  // Secondary (right) mouse button
    case 3:
      return 8  // "Back" button
    case 4:
      return 16 // "Forward" button
    default:
      return 0  // No button pressed
  }
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
      this.touches[touch.identifier] = new Touch(touch, { context })
    }

    this.forwardTouches(event)
  }

  handleTouchMove(event) {
    const context = this.getTouchContextByTouches(event.touches)
    for (const touch of event.touches) {
      if (this.touches[touch.identifier] != null) {
        this.touches[touch.identifier].update(touch)
        if (this.touches[touch.identifier].context === TouchContext.PRIMARY_CLICK && context === TouchContext.ZOOM_PAN_GESTURE) {
          this.touches[touch.identifier].context = context
        }
      } else {
        this.touches[touch.identifier] = new Touch(touch, { context })
      }
    }

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
          this.fakeTouchEvent(event, touch, touchInstance.context.mouseButton)
        }
      } else {
        console.warn(`Found no touch instance for ID ${touch.identifier}`, this.touches)
      }
    }
  }

  fakeTouchEvent(originalEvent, touch, mouseButton) {
    if (originalEvent == null || typeof originalEvent !== 'object') {
      console.warn(`Passed invalid event argument to fakeTouchEvent: ${originalEvent}`)
      return
    }

    const types = {
      // First simulate that the pointer moves to the specified location, then simulate the down event.
      // Foundry won't take the "click" on the first try otherwise.
      touchstart: ['pointermove', 'pointerdown'],
      touchmove: ['pointermove'],
      touchend: ['pointerup'],
    }[originalEvent.type]

    for (const type of types) {
      const mouseEventInitProperties = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        screenX: touch.screenX,
        screenY: touch.screenY,
        ctrlKey: originalEvent.ctrlKey || false,
        altKey: originalEvent.altKey || false,
        shiftKey: originalEvent.shiftKey || false,
        metaKey: originalEvent.metaKey || false,
        button: mouseButton,
        buttons: bitCodeMouseButton(mouseButton),
        relatedTarget: originalEvent.relatedTarget || null,
        region: originalEvent.region || null,
        detail: 0,
        view: window,
        sourceCapabilities: originalEvent.sourceCapabilities,
        eventInit: {
          bubbles: true,
          cancelable: true,
          composed: true,
        },
      }

      let simulatedEvent
      if (type.indexOf('mouse') === 0) {
        simulatedEvent = new MouseEvent(type, mouseEventInitProperties)
      } else {
        const pointerEventInit = {
          pointerId: touch.identifier,
          pointerType: 'mouse',
          isPrimary: true,
          ...mouseEventInitProperties,
        }
        console.info(`Simulating ${type} for ID ${pointerEventInit.pointerId}`)
        simulatedEvent = new PointerEvent(type, pointerEventInit)
      }
      touch.target.dispatchEvent(simulatedEvent)
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
