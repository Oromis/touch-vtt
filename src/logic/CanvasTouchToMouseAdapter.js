import TouchToMouseAdapter from './TouchToMouseAdapter.js'
import Vectors from './Vectors.js'
import MathUtils from '../utils/MathUtils.js'
import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Screen from '../browser/Screen.js'
import TouchContext from './TouchContext.js'

class CanvasTouchToMouseAdapter extends TouchToMouseAdapter {
  constructor(canvas) {
    super(canvas)
  }

  handleTouchMove(event) {
    this.updateActiveTouches(event)

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
    const zoomBefore = FoundryCanvas.worldTransform.a
    const zoomLevelChanges = MathUtils.roundToDecimals(zoomAfter, 2) !== zoomBefore

    // There's some weirdness going on with how PIXI implements vectors / matrices: Zoom values are rounded to
    // two decimal places. This messes with my calculations here, which is why I need the following line. I'm not
    // entirely sure why it works, but it does work great :D
    const adjustedZoom = zoomLevelChanges ? zoomBefore : zoomAfter
    const adjustedTransform = FoundryCanvas.getWorldTransformWith({ zoom: adjustedZoom }, { discrete: true })
    const correctionA = this.calcPanCorrection(adjustedTransform, this.touches[firstId])
    const correctionB = this.calcPanCorrection(adjustedTransform, this.touches[secondId])
    panCorrection = Vectors.centerBetween(correctionA, correctionB)
    const centerBefore = FoundryCanvas.screenToWorld(Screen.center)
    const worldCenter = Vectors.subtract(centerBefore, panCorrection)

    FoundryCanvas.pan({
      x: worldCenter.x,
      y: worldCenter.y,
      zoom: zoomAfter
    })
  }

  calcPanCorrection(transform, touch) {
    const touchedPointOnWorldAfter = transform.applyInverse(touch.current)
    return Vectors.subtract(touchedPointOnWorldAfter, touch.world)
  }

  getEventMap() {
    return {
      // First simulate that the pointer moves to the specified location, then simulate the down event.
      // Foundry won't take the "click" on the first try otherwise.
      touchstart: ['pointermove', 'pointerdown'],
      touchmove: ['pointermove'],
      touchend: ['pointerup'],
    }
  }


  getTouchContextByTouches(touches) {
    return touches.length >= 2 ? TouchContext.ZOOM_PAN_GESTURE : TouchContext.PRIMARY_CLICK
  }
}

CanvasTouchToMouseAdapter.init = function init(canvas) {
  return new CanvasTouchToMouseAdapter(canvas)
}

export default CanvasTouchToMouseAdapter
