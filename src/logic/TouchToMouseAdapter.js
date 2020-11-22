import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Touch from './Touch.js'
import Vectors from './Vectors.js'
import Screen from '../browser/Screen.js'
import MathUtils from '../utils/MathUtils.js'

const longTouchThreshholdPx = 3;
const mouseButtons = {
  left: 0,
  right: 2
}

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

function resetLongTouch() {
  clearTimeout(holdTimer);
  holdTimer = null;
  longTouchPrimed = false;
}

let activeMouseDown = null
let holdTimer = null
let lastPositions = {}
let longTouchPrimed = false
let startPositions = {}
let storedTouchStartEvent = null

let mousePos = null
function onMouseMove(event) {
  mousePos = {
    x: event.clientX,
    y: event.clientY,
  }
}

class TouchToMouseAdapter {
  constructor(canvas) {
    this.canvas = canvas
    this.touches = {}

    const touchHandler = this.handleTouch.bind(this)
    canvas.addEventListener('touchstart', touchHandler, true)
    canvas.addEventListener('touchmove', touchHandler, true)
    canvas.addEventListener('touchend', touchHandler, true)
    canvas.addEventListener('touchcancel', touchHandler, true)
    canvas.addEventListener('mousemove', onMouseMove)
  }

  // The full touch handler with multi-touch pinching and panning support
  handleTouch(event) {
    if (event.type === 'touchstart' || event.type === 'touchmove') {
      if (event.type === 'touchmove') {
        this.handleTouchMove(event)
      } else {
        this.handleTouchStart(event)
      }

      this.storeTouchPositions(event)
    } else {
      this.handleTouchEnd(event)
    }

    event.preventDefault()
  }

  handleTouchStart(event) {
    for (const touch of event.touches) {
      this.touches[touch.identifier] = new Touch(touch)
    }
  }

  handleTouchMove(event) {
    for (const touch of event.touches) {
      if (this.touches[touch.identifier] != null) {
        this.touches[touch.identifier].update(touch)
      } else {
        this.touches[touch.identifier] = new Touch(touch)
      }
    }

    if (event.touches.length === 1 && Object.keys(lastPositions).length === 1 && storedTouchStartEvent !== null) {
      // Check if we're exceeding the long touch movement threshold. If we are, trigger the stored event.
      const dxStart = event.touches[0].clientX - startPositions[event.touches[0].identifier].x
      const dyStart = event.touches[0].clientY - startPositions[event.touches[0].identifier].y
      if (Math.abs(dxStart) > longTouchThreshholdPx || Math.abs(dyStart) > longTouchThreshholdPx) {
        this.fakeTouchEvent(storedTouchStartEvent, storedTouchStartEvent.changedTouches[0], mouseButtons.left, true)
        storedTouchStartEvent = null
        resetLongTouch()
      }
    } else if (event.touches.length === 2 && Object.keys(this.touches).length === 2) {
      // Two-finger touch move
      this.handleTwoFingerGesture(event)
    }

    if (event.touches.length === 1 && activeMouseDown != null) {
      this.fakeTouchEvent(event, event.changedTouches[0], mouseButtons.left, false)
    }
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
    this.touches = {}

    if (event.type === 'touchend' && longTouchPrimed && event.touches.length === 0) {
      this.fakeTouchEvent(storedTouchStartEvent, storedTouchStartEvent.changedTouches[0], mouseButtons.right)
      this.fakeTouchEvent(event, event.changedTouches[0], mouseButtons.right)
    } else if (event.touches.length <= 1) {
      if (activeMouseDown == null && storedTouchStartEvent != null) {
        this.fakeTouchEvent(storedTouchStartEvent, storedTouchStartEvent.changedTouches[0], mouseButtons.left)
      }
      this.fakeTouchEvent(event, event.changedTouches[0], mouseButtons.left)
    }
    lastPositions = {}
    startPositions = {}
    resetLongTouch()
  }

  storeTouchPositions(event) {
    lastPositions = {}
    for (const touch of event.touches) {
      lastPositions[touch.identifier] = {
        x: touch.clientX,
        y: touch.clientY,
      }

      if (startPositions[touch.identifier] == null) {
        startPositions[touch.identifier] = {
          x: touch.clientX,
          y: touch.clientY,
        }
      }
    }
  }

  fakeTouchEvent(originalEvent, touch, mouseButton, recordActiveMouseDown = true) {
    if (originalEvent == null || typeof originalEvent !== 'object') {
      console.warn(`Passed invalid event argument to fakeTouchEvent: ${originalEvent}`)
      return
    }

    const type = {
      touchstart: 'mousedown',
      touchmove: 'mousemove',
      touchend: 'mouseup',
    }[originalEvent.type]

    const simulatedEvent = new MouseEvent(type, {
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
    })
    touch.target.dispatchEvent(simulatedEvent)

    if (recordActiveMouseDown) {
      if (type === 'mousedown') {
        activeMouseDown = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          screenX: touch.screenX,
          screenY: touch.screenY,
          target: touch.target,
        }
      } else if (type === 'mouseup') {
        activeMouseDown = null
      }
    }
  }

  calcPanCorrection(transform, touch) {
    const touchedPointOnWorldAfter = transform.applyInverse(touch.current)
    return Vectors.subtract(touchedPointOnWorldAfter, touch.world)
  }
}

TouchToMouseAdapter.init = function init(canvas) {
  return new TouchToMouseAdapter(canvas)
}

export default TouchToMouseAdapter
