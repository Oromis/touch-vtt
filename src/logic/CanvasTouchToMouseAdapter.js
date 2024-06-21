import TouchToMouseAdapter from './TouchToMouseAdapter.js'
import Vectors from './Vectors.js'
import MathUtils from '../utils/MathUtils.js'
import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Screen from '../browser/Screen.js'
import TouchContext from './TouchContext.js'
import {idOf} from '../utils/EventUtils.js'
import {GESTURE_MODE_SETTING, GESTURE_MODE_SPLIT, GESTURE_MODE_OFF} from '../config/TouchSettings.js'
import {MODULE_NAME} from '../config/ModuleConstants.js'

class CanvasTouchToMouseAdapter extends TouchToMouseAdapter {
  constructor(canvas) {
    super(canvas)

    this._gesturesEnabled = true
  }

  handleTouchMove(event) {
    this.updateActiveTouches(event)

    switch (this.touchIds.length) {
      case 2:
        if (this.gesturesEnabled()) {
          if (this.useSplitGestures()) {
            this.handleTwoFingerZoom(event)
          } else {
            this.handleTwoFingerZoomAndPan(event)
          }
        }
        break

      case 3:
      case 4:
        if (this.gesturesEnabled()) {
          this.handleMultiFingerPan(event)
        }
        break

      default:
        if (parseInt(game.version) < 12) {
          // The entire forwarding/dispatching setup is not really necessary in v12 and should probably be cleaned up better
          // Just a version check for now. See also TouchToMouseAdapter.js
          this.forwardTouches(event)
        }
    }
  }

  handleTwoFingerZoomAndPan() {
    if (FoundryCanvas.isZoomAllowed()) {
      this.handleTwoFingerZoom()
    }
    if (FoundryCanvas.isPanAllowed()) {
      this.handleMultiFingerPan()
    }
  }

  handleTwoFingerZoom() {
    if (!FoundryCanvas.isZoomAllowed()) {
      return
    }

    const touchIds = this.touchIds
    const firstTouch = this.touches[touchIds[0]]
    const secondTouch = this.touches[touchIds[1]]

    FoundryCanvas.zoom(this.calcZoom(firstTouch, secondTouch))
  }

  handleMultiFingerPan() {
    if (!FoundryCanvas.isPanAllowed()) {
      return
    }

    const touchIds = this.touchIds
    const adjustedTransform = FoundryCanvas.worldTransform

    //let panCorrection
    //if (touchIds.length === 2) {
    //  panCorrection = Vectors.centerBetween(
    //    this.calcPanCorrection(adjustedTransform, this.touches[touchIds[0]]),
    //    this.calcPanCorrection(adjustedTransform, this.touches[touchIds[1]]),
    //  )
    //} else {
    //  panCorrection = Vectors.centerOf(
    //    this.calcPanCorrection(adjustedTransform, this.touches[touchIds[0]]),
    //    this.calcPanCorrection(adjustedTransform, this.touches[touchIds[1]]),
    //    this.calcPanCorrection(adjustedTransform, this.touches[touchIds[2]]),
    //  )
    //}

    // It seems to me that panning to the center between the touches is disorienting and creates unwanted movement
    // I prefer trying out this version where we anchor to the first touch, I'll leave the existing above in case we want to revert 
    let panCorrection = this.calcPanCorrection(adjustedTransform, this.touches[touchIds[0]])

    const centerBefore = FoundryCanvas.screenToWorld(Screen.center)
    const worldCenter = Vectors.subtract(centerBefore, panCorrection)

    FoundryCanvas.pan({ x: worldCenter.x, y: worldCenter.y })
  }

  calcZoom(firstTouch, secondTouch) {
    const zoomVector = Vectors.divideElements(
      Vectors.subtract(firstTouch.current, secondTouch.current),
      Vectors.subtract(firstTouch.world, secondTouch.world),
    )
    const fingerLayout = Vectors.abs(Vectors.subtract(firstTouch.current, secondTouch.current))
    const totalMovement = fingerLayout.x + fingerLayout.y
    const factorX = fingerLayout.x / totalMovement
    const factorY = fingerLayout.y / totalMovement
    return (factorX * zoomVector.x) + (factorY * zoomVector.y)
  }

  calcPanCorrection(transform, touch) {
    const touchedPointOnWorldAfter = transform.applyInverse(touch.current)
    return Vectors.subtract(touchedPointOnWorldAfter, touch.world)
  }

  getTouchContextByTouches(event) {
    const existingTouchCount = this.touchIds.length
    if (existingTouchCount >= 2 || (existingTouchCount === 1 && this.touches[idOf(event)] == null)) {
      return TouchContext.ZOOM_PAN_GESTURE
    } else {
      return TouchContext.PRIMARY_CLICK
    }
  }

  getEventMap() {
    if (parseInt(game.version) < 12) {
      return {
        // v11 only:
        // First simulate that the pointer moves to the specified location, then simulate the down event.
        // Foundry won't take the "click" on the first try otherwise.
        pointerdown: ['pointermove', 'pointerdown'],
        pointermove: ['pointermove'],
        pointerup: ['pointerup'],
        pointercancel: ['pointercancel'],
      }
    } else {
      return {
        pointerdown: ['pointerdown'],
        pointermove: ['pointermove'],
        pointerup: ['pointerup'],
        pointercancel: ['pointercancel'],
      }
    }
  }

  useSplitGestures() {
    return game.settings.get(MODULE_NAME, GESTURE_MODE_SETTING) === GESTURE_MODE_SPLIT
  }

  useNoGestures() {
    return game.settings.get(MODULE_NAME, GESTURE_MODE_SETTING) === GESTURE_MODE_OFF
  }

  disableGestures() {
    this._gesturesEnabled = false
  }

  enableGestures() {
    this._gesturesEnabled = true
  }

  gesturesEnabled() {
    return this._gesturesEnabled && !this.useNoGestures()
  }
}

CanvasTouchToMouseAdapter.init = function init(canvas) {
  return new CanvasTouchToMouseAdapter(canvas)
}

export default CanvasTouchToMouseAdapter
