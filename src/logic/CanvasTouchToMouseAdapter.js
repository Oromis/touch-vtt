import TouchToMouseAdapter from './TouchToMouseAdapter.js'
import Vectors from './Vectors.js'
import MathUtils from '../utils/MathUtils.js'
import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Screen from '../browser/Screen.js'
import TouchContext from './TouchContext.js'
import {idOf} from '../utils/EventUtils.js'
import {GESTURE_MODE_SETTING, GESTURE_MODE_SPLIT} from '../config/TouchSettings.js'
import {MODULE_NAME} from '../config/ModuleConstants.js'

class CanvasTouchToMouseAdapter extends TouchToMouseAdapter {
  constructor(canvas) {
    super(canvas)
  }

  handleTouchMove(event) {
    this.updateActiveTouches(event)

    switch (Object.keys(this.touches).length) {
      case 2:
        if (this.useSplitGestures()) {
          this.handleTwoFingerZoom(event)
        } else {
          this.handleTwoFingerZoomAndPan(event)
        }
        break

      case 3:
        if (this.useSplitGestures()) {
          this.handleThreeFingerPan(event)
        } else {
          this.forwardTouches(event)
        }
        break

      default:
        this.forwardTouches(event)
    }
  }

  handleTwoFingerZoomAndPan() {
    // Use the first two touch points for gestures
    const touchIds = Object.keys(this.touches)
    const firstTouch = this.touches[touchIds[0]]
    const secondTouch = this.touches[touchIds[1]]

    const zoomBefore = FoundryCanvas.worldTransform.a
    const zoomAfter = this.calcZoom(firstTouch, secondTouch)
    const zoomLevelChanges = MathUtils.roundToDecimals(zoomAfter, 2) !== zoomBefore

    // There's some weirdness going on with how PIXI implements vectors / matrices: Zoom values are rounded to
    // two decimal places. This messes with my calculations here, which is why I need the following line. I'm not
    // entirely sure why it works, but it does work great :D
    const adjustedZoom = zoomLevelChanges ? zoomBefore : zoomAfter
    const adjustedTransform = FoundryCanvas.getWorldTransformWith({ zoom: adjustedZoom }, { discrete: true })
    const correctionA = this.calcPanCorrection(adjustedTransform, firstTouch)
    const correctionB = this.calcPanCorrection(adjustedTransform, secondTouch)
    const panCorrection = Vectors.centerBetween(correctionA, correctionB)
    const centerBefore = FoundryCanvas.screenToWorld(Screen.center)
    const worldCenter = Vectors.subtract(centerBefore, panCorrection)

    FoundryCanvas.pan({
      x: worldCenter.x,
      y: worldCenter.y,
      zoom: zoomAfter
    })
  }

  handleTwoFingerZoom() {
    const touchIds = Object.keys(this.touches)
    const firstTouch = this.touches[touchIds[0]]
    const secondTouch = this.touches[touchIds[1]]

    FoundryCanvas.zoom(this.calcZoom(firstTouch, secondTouch))
  }

  handleThreeFingerPan() {
    const touchIds = Object.keys(this.touches)
    const adjustedTransform = FoundryCanvas.worldTransform
    const panCorrection = Vectors.centerOf(
      this.calcPanCorrection(adjustedTransform, this.touches[touchIds[0]]),
      this.calcPanCorrection(adjustedTransform, this.touches[touchIds[1]]),
      this.calcPanCorrection(adjustedTransform, this.touches[touchIds[2]]),
    )
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
    const existingTouchCount = Object.keys(this.touches).length
    if (existingTouchCount >= 2 || (existingTouchCount === 1 && this.touches[idOf(event)] == null)) {
      return TouchContext.ZOOM_PAN_GESTURE
    } else {
      return TouchContext.PRIMARY_CLICK
    }
  }

  getEventMap() {
    return {
      // First simulate that the pointer moves to the specified location, then simulate the down event.
      // Foundry won't take the "click" on the first try otherwise.
      pointerdown: ['pointermove', 'pointerdown'],
      pointermove: ['pointermove'],
      pointerup: ['pointerup'],
      pointercancel: ['pointercancel'],
    }
  }

  useSplitGestures() {
    return game.settings.get(MODULE_NAME, GESTURE_MODE_SETTING) === GESTURE_MODE_SPLIT
  }
}

CanvasTouchToMouseAdapter.init = function init(canvas) {
  return new CanvasTouchToMouseAdapter(canvas)
}

export default CanvasTouchToMouseAdapter
