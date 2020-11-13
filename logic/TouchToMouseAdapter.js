import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Touch from './Touch.js'
import Vectors from './Vectors.js'
import Screen from '../browser/Screen.js'
import ObjectUtils from '../utils/ObjectUtils.js'

const longTouchDurationMs = 500;
const longTouchThreshholdPx = 3;
const mouseButtons = {
  left: 0,
  right: 2
};

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

function sign(num) {
  if (num < 0) {
    return -1
  } else if (num > 0) {
    return 1
  } else {
    return 0
  }
}

function resetLongTouch() {
  clearTimeout(holdTimer);
  holdTimer = null;
  longTouchPrimed = false;
}

let activeMouseDown = null
let editorWrapper = null
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

function onMouseClick() {
  console.log("Mouse pos: ", mousePos)
  console.log("\tWorld pos: ", FoundryCanvas.screenToWorld(mousePos))
  FoundryCanvas.pan(FoundryCanvas.screenToWorld(mousePos))
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
    canvas.addEventListener('click', onMouseClick)
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
    // const touchPointScreen = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    // const centerScreen = Screen.center
    // const touchPointWorld = FoundryCanvas.screenToWorld(touchPointScreen)
    // const centerWorld = FoundryCanvas.screenToWorld(centerScreen)
    //
    // FoundryCanvas.pan({
    //   x: centerWorld.x,
    //   y: centerWorld.y,
    //   zoom: FoundryCanvas.zoom
    // })
    // return

    // if (event.touches.length === 1) {
    //   storedTouchStartEvent = event
    //   holdTimer = setTimeout(function () {
    //     longTouchPrimed = true
    //   }, longTouchDurationMs)
    // } else {
    //   storedTouchStartEvent = null
    //   resetLongTouch()
    // }

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

      return

      if (Math.abs(sign(dx1Start) - sign(dx2Start)) === 2 || Math.abs(sign(dy1Start) - sign(dy2Start)) === 2) {
        // Fingers move in opposite directions => zoom gesture
        const lastDistX = Math.abs(lastPositions[event.touches[0].identifier].x -
          lastPositions[event.touches[1].identifier].x)
        const lastDistY = Math.abs(lastPositions[event.touches[0].identifier].y -
          lastPositions[event.touches[1].identifier].y)
        const lastDist = Math.sqrt(lastDistX * lastDistX + lastDistY * lastDistY)

        const newDistX = Math.abs(event.touches[0].clientX - event.touches[1].clientX)
        const newDistY = Math.abs(event.touches[0].clientY - event.touches[1].clientY)
        const newDist = Math.sqrt(newDistX * newDistX + newDistY * newDistY)

        const touchCenter = {
          x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
          y: (event.touches[0].clientY + event.touches[1].clientY) / 2,
        }

        const factor = newDist / lastDist / 10
        const delta = 1// - factor

        const worldCenter = FoundryCanvas.screenToWorld(touchCenter)
        const worldSize = FoundryCanvas.worldSize
        console.log("Panning to touchCenter: ", touchCenter, ", worldCenter: ", worldCenter, ", worldSize: ", worldSize)
        FoundryCanvas.pan({
          x: worldCenter.x,
          y: worldCenter.y,
          zoom: FoundryCanvas.zoom + delta
        })

        // const evt = new WheelEvent('wheel', {
        //   isTrusted: true,
        //   deltaY: delta,
        //   altKey: event.altKey || false,
        //   shiftKey: event.shiftKey || false,
        //   ctrlKey: event.shiftKey || false,
        //   metaKey: event.metaKey || false,
        //   bubbles: true,
        //   cancelable: true,
        //   x: touchCenter.x,
        //   y: touchCenter.y,
        //   layerX: touchCenter.x,
        //   layerY: touchCenter.y,
        //   clientX: touchCenter.x,
        //   clientY: touchCenter.y,
        //   clientX: touchCenter.x,
        //   clientY: touchCenter.y,
        //   view: window,
        //   which: 1,
        // })
        // this.canvas.dispatchEvent(evt)
      } else {
        // Fingers move in the same direct => pan gesture
        const dx1 = event.touches[0].clientX - lastPositions[event.touches[0].identifier].x
        const dx2 = event.touches[1].clientX - lastPositions[event.touches[1].identifier].x
        const dy1 = event.touches[0].clientY - lastPositions[event.touches[0].identifier].y
        const dy2 = event.touches[1].clientY - lastPositions[event.touches[1].identifier].y

        const dx = (dx1 + dx2) / 2
        const dy = (dy1 + dy2) / 2

        editorWrapper.scrollLeft -= dx
        editorWrapper.scrollTop -= dy
      }
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

    // const distanceBefore = Vectors.distance(this.touches[firstId].last, this.touches[secondId].last)
    // const distanceNow = Vectors.distance(this.touches[firstId].current, this.touches[secondId].current)
    // const zoomBefore = FoundryCanvas.zoom
    // const zoomAfter = zoomBefore * (distanceNow / distanceBefore)

    // const adjustedTransform = FoundryCanvas.getWorldTransformWith({ zoom: zoomAfter })
    // const touchedPointOnWorldBefore = FoundryCanvas.screenToWorld(this.touches[firstId].last)
    // const touchedPointOnWorldAfter = adjustedTransform.applyInverse(this.touches[firstId].current)
    // const panCorrection = Vectors.subtract(touchedPointOnWorldAfter, touchedPointOnWorldBefore)
    //
    // console.log({ adjusted: ObjectUtils.cloneObject(adjustedTransform), original: ObjectUtils.cloneObject(FoundryCanvas.worldTransform) })
    //
    // const centerBefore = FoundryCanvas.screenToWorld(Screen.center)
    // const centerAfter = Vectors.add(centerBefore, panCorrection)

    // console.log({
    //   adjustedTransform,
    //   touchedPointOnWorldBefore,
    //   touchedPointOnWorldAfter,
    //   panCorrection,
    //   centerBefore,
    //   centerAfter
    // })

    // console.log("Actual Transform: ", FoundryCanvas.worldTransform)
    // console.log("Predicted Transform: ", adjustedTransform)

    console.log(`Zooming to ${zoomAfter}, Center: `, centerBefore)
    FoundryCanvas.pan({
      x: centerBefore.x,
      y: centerBefore.y,
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
}

TouchToMouseAdapter.init = function init(canvas) {
  return new TouchToMouseAdapter(canvas)
}

export default TouchToMouseAdapter
