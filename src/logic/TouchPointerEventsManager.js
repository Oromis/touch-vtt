import Touch from './Touch.js'
import {dispatchModifiedEvent} from "./FakeTouchEvent"
import Vectors from './Vectors.js'
import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Screen from '../browser/Screen.js'
import {getSetting, ZOOM_SENSITIVITY_SETTING, GESTURE_MODE_SETTING, GESTURE_MODE_SPLIT, GESTURE_MODE_OFF} from '../config/TouchSettings.js'

// This class is similar in structure to the original CanvasTouchToMouseAdapter, but it doesn't capture/prevent events
// It only hooks into the PointerEvents and tracks them for specific fixes (by dispatching additional events) and multi-touch management

class TouchPointerEventsManager {
  constructor(element) {
    this.touches = {}

    const touchHandler = this.handleTouch.bind(this)
    for (const eventType of this.getListenerEvents()) {
      element.addEventListener(eventType, touchHandler, this.getEventListenerOptions())
    }

    this._gesturesEnabled = true
  }

  handleTouch(event) {

    if (!this.isTouchPointerEvent(event)) {
      return
    }

    // Only touch-based events here

    // Here we manage any of the up/down/move PointerEvents on the canvas
    // Some generic fixes go here

    if (game.release.generation < 12) {

      if (event.type == "pointerdown" && event.isTrusted) {
        // This fixes the issue where a placeable is not selectable until is hovered, we need a move event in the area
        // Probably why the original module did the pointermove+pointerdown thing, not needed in v12
        dispatchModifiedEvent(event, "pointermove", {button: -1, buttons: 0})
      }
      
    }

    if (this.shouldHandleEvent(event)) {
      // shouldHandleEvent excludes our fake events at this time
      switch (event.type) {
        case 'pointerdown':
          this.handleTouchStart(event)
          break

        case 'pointermove':
          this.handleTouchMove(event)
          break

        case 'pointerup':
          this.handleTouchEnd(event)
          break
        
        case 'pointercancel':
          this.handleEndAll(event)
          break

        default:
          console.warn(`Unknown touch event type ${event.type}`)
          break
      }
    }
  }

  handleTouchStart(event) {
    this.updateActiveTouch(event)
    if (this.touchIds.length > 1) {
      // This is to cancel any drag-style action (usually a selection rectangle) when we start having multiple touches
      dispatchModifiedEvent(event, "pointerup")
    }
  }

  handleTouchMove(event) {
    this.updateActiveTouch(event)

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
    }
  }

  handleTwoFingerZoomAndPan() {
    this.handleTwoFingerZoom()
    this.handleMultiFingerPan()
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

  easeFactorBasedOnDistance(touchDistance, closeThreshold) {
    // Sigmoid function, 0 to 1 for positive values, balanced around what we consider "close"
    // We use it to basically decrease sensitivity as the touches get closer
    return 2 / (1 + Math.E ** (-touchDistance/closeThreshold)) - 1
  }

  calcZoom(firstTouch, secondTouch) {
    const sensitivity = getSetting(ZOOM_SENSITIVITY_SETTING)
    const lastDistance = Vectors.distance(firstTouch.last, secondTouch.last)
    const currentDistance = Vectors.distance(firstTouch.current, secondTouch.current)
    const normalizedDelta = (currentDistance - lastDistance) / lastDistance
    return canvas.stage.scale.x * (1 + normalizedDelta * sensitivity * this.easeFactorBasedOnDistance(currentDistance, 100)) // assuming 100px distance is "close touches"
  }

  calcPanCorrection(transform, touch) {
    const touchedPointOnWorldAfter = transform.applyInverse(touch.current)
    return Vectors.subtract(touchedPointOnWorldAfter, touch.world)
  }

  handleTouchEnd(event) {
    this.cleanUpTouch(event)
  }

  handleEndAll(event) {
    this.cleanUpAll()
  }

  updateActiveTouch(event) {
    var id = event.pointerId
    if (this.touches[id] != null) {
      this.touches[id].update(event, event)
    } else {
      this.touches[id] = new Touch(event, event)
    }
  }

  cleanUpAll() {
    this.touches = {}
  }

  cleanUpTouch(event) {
    delete this.touches[event.pointerId]
  }

  getEventListenerOptions() {
    return {
      capture: true,
      passive: false,
    }
  }

  getListenerEvents() {
    return ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']
  }

  shouldHandleEvent(event) {
    return event.isTrusted
  }

  isTouchPointerEvent(event) {
    return event instanceof PointerEvent && ["touch", "pen"].includes(event.pointerType)
  }

  get touchIds() {
    return Object.keys(this.touches)
  }

  useSplitGestures() {
    return getSetting(GESTURE_MODE_SETTING) === GESTURE_MODE_SPLIT
  }

  useNoGestures() {
    return getSetting(GESTURE_MODE_SETTING) === GESTURE_MODE_OFF
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

TouchPointerEventsManager.init = function init(element) {
  return new TouchPointerEventsManager(element)
}

export default TouchPointerEventsManager
