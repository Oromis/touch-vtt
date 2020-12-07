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

    if ( Object.keys(this.touches).length === 2) {
      // Two-finger touch move
      this.handleTwoFingerGesture(event)
    }
    else {
      this.forwardTouches(event, Object.values(this.touches))
    }
  }

  handleTwoFingerGesture(event) {
    const k = Object.keys(this.touches)
    const firstTouch = this.touches[k[0]]
    const secondTouch = this.touches[k[1]]

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

  getTouchContextByTouches(touches) {
    return touches.length >= 2 ? TouchContext.ZOOM_PAN_GESTURE : TouchContext.PRIMARY_CLICK
  }
}

CanvasTouchToMouseAdapter.init = function init(canvas) {
  return new CanvasTouchToMouseAdapter(canvas)
}

export default CanvasTouchToMouseAdapter
