import {MODULE_DISPLAY_NAME} from '../config/ModuleConstants.js'
import {dispatchCopy, dispatchModifiedEvent} from "./FakeTouchEvent.js"
import Vectors from './Vectors.js'
import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Screen from '../browser/Screen.js'
import {getSetting, DEBUG_MODE_SETTING, ZOOM_THRESHOLD_SETTING, PAN_THRESHOLD_SETTING, GESTURE_MODE_SETTING, GESTURE_MODE_SPLIT, GESTURE_MODE_OFF} from '../config/TouchSettings.js'
import TouchPointerEventsManager from './TouchPointerEventsManager.js'

// This class is similar in structure to the original CanvasTouchToMouseAdapter, but it doesn't capture/prevent events
// It only hooks into the PointerEvents and tracks them for specific fixes (by dispatching additional events) and multi-touch management

class CanvasTouchPointerEventsManager extends TouchPointerEventsManager {
  constructor(element) {
    super(element)

    this._forcedZoomThreshold = null
    this._forcedPanThreshold = null

    this.GESTURE_STATUSES = {NONE: 0, WAITING: 1, ACTIVE: 2}
    this._zoomGesture = {
      status: this.GESTURE_STATUSES.NONE,
      initiatingCoords: null,
      activationCoords: null,
      activationWorldCoords: null
    }
    this._panGesture = {
      status: this.GESTURE_STATUSES.NONE,
      initiatingCoords: null,
      activationCoords: null
    }

    // Fix for some trackpads sending pointerdown of type mouse without any previous move event
    document.body.addEventListener("pointerdown", evt => {  
      if (evt.isTrusted && !evt.pressure && evt.target === element) {
        evt.preventDefault()
        evt.stopPropagation()
        evt.stopImmediatePropagation()
        dispatchModifiedEvent(evt, "pointermove")
        dispatchModifiedEvent(evt, "pointerdown")
        return false
      }
    }, {
      capture: true,
      passive: false,
    })

    // New v11 fix (started in v2.2.3): we completely block these events as soon as possible.
    // We dispatch a pointermove to the location first (not for pointerup), then we dispatch a clone of the original. Except touchstart, that one is gone.
    if (game.release.generation < 12) {
      Array("pointerdown", "pointermove", "pointerup", "pointerleave", "touchstart").forEach(e => {
        window.addEventListener(e, evt => {
          if (evt.isTrusted && (evt instanceof TouchEvent || ["touch", "pen"].includes(evt.pointerType)) && evt.target === element) {
            evt.preventDefault()
            evt.stopPropagation()
            evt.stopImmediatePropagation()
            
            if (["pointerdown", "pointermove"].includes(evt.type)) {
              dispatchModifiedEvent(evt, "pointermove", {button: -1, buttons: 0})
            }
      
            if (evt.type !== "touchstart" && !(evt.type == "pointerleave" && evt.pointerType != "pen")) {
              dispatchCopy(evt)
            }
            return false
          }
        }, {
          capture: true,
          passive: false,
        })
      })
    
      // Force hover check on every placeable in the active layer on every pointerdown/pointerup
      Array("pointerdown", "pointerup").forEach(e => {
        document.body.addEventListener(e, (evt) => {
          if (evt.touchvttTrusted || (evt.isTrusted && (evt instanceof TouchEvent || ["touch", "pen"].includes(evt.pointerType)) && evt.target === element)) {
            canvas.activeLayer.placeables.forEach(p => {
              const mousePos = canvas.mousePosition
              if (p.bounds.contains(mousePos.x, mousePos.y)) {
                if (!p.hover) {
                  p._onHoverIn(new PIXI.FederatedEvent("pointerover"), {hoverOutOthers: true})
                  if (p.mouseInteractionManager.state < MouseInteractionManager.INTERACTION_STATES.HOVER) {
                    p.mouseInteractionManager.state = MouseInteractionManager.INTERACTION_STATES.HOVER
                  }
                }
              } else {
                if (p.hover) {
                  p._onHoverOut(new PIXI.FederatedEvent("pointerout"))
                  p.mouseInteractionManager.state = MouseInteractionManager.INTERACTION_STATES.NONE
                }
              }
            })
          }
        }, true)
      })

    }
  }

  onTouchAdded(event) {
    if (this.touchIds.length > 1) {
      // This is to cancel any drag-style action (usually a selection rectangle) when we start having multiple touches
      const cancelEvent = new MouseEvent("contextmenu", {clientX: 0, clientY: 0, bubbles: true, cancelable: true, view: window, button: 2})
      event.target.dispatchEvent(cancelEvent)
    }
  }

  onTouchRemoved(event) {
    if (this.touchIds.length > 0) {
      this.disableGestures()
      if (getSetting(DEBUG_MODE_SETTING)) {
        console.log(MODULE_DISPLAY_NAME + ": disabled gestures")
      }
    } else {
      this.enableGestures()
      if (getSetting(DEBUG_MODE_SETTING)) {
        console.log(MODULE_DISPLAY_NAME + ": enabled gestures")
      }
    }

    this._zoomGesture = {
      status: this.GESTURE_STATUSES.NONE,
      initiatingCoords: null,
      activationCoords: null,
      activationWorldCoords: null
    }
    this._panGesture = {
      status: this.GESTURE_STATUSES.NONE,
      initiatingCoords: null,
      activationCoords: null
    }
  }

  handleTouchMove(event) {
    this.updateActiveTouch(event)
    
    switch (this.touchIds.length) {
      case 2:
        if (this.gesturesEnabled()) {
          if (this.useSplitGestures()) {
            this.handleTwoFingerZoom()
          } else {
            this.handleTwoFingerZoomAndPan()
          }
        }
        break

      case 3:
      case 4:
        if (this.gesturesEnabled()) {
          this.handleMultiFingerPan()
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

    if (this._zoomGesture.status == this.GESTURE_STATUSES.NONE) {
      this._zoomGesture.initiatingCoords = [{...firstTouch.current}, {...secondTouch.current}]
      this._zoomGesture.status = this.GESTURE_STATUSES.WAITING
    }
    const initiatingDistance = Vectors.distance(this._zoomGesture.initiatingCoords[0], this._zoomGesture.initiatingCoords[1])
    const currentDistance = Vectors.distance(firstTouch.current, secondTouch.current)

    if (this._zoomGesture.status < this.GESTURE_STATUSES.ACTIVE) {
      if (Math.abs(currentDistance - initiatingDistance) > this.zoomThresholdFunction(this.getZoomThreshold())) {
        this._zoomGesture.activationCoords = [{...firstTouch.current}, {...secondTouch.current}]
        this._zoomGesture.activationWorldCoords = [FoundryCanvas.screenToWorld({...firstTouch.current}), FoundryCanvas.screenToWorld({...secondTouch.current})]
        this._zoomGesture.status = this.GESTURE_STATUSES.ACTIVE
      }
    }

    if (this._zoomGesture.status == this.GESTURE_STATUSES.ACTIVE) {
      FoundryCanvas.zoom(this.calcZoom())
    }

  }

  calcZoom() {
    const touchIds = this.touchIds
    const originalWorldDistance = Vectors.distance(this._zoomGesture.activationWorldCoords[0], this._zoomGesture.activationWorldCoords[1])
    const newScreenDistance = Vectors.distance(this.touches[touchIds[0]].current, this.touches[touchIds[1]].current)
    const newScale = newScreenDistance / originalWorldDistance    
    return newScale
  }

  zoomThresholdFunction(threshold) {
    if (threshold == 0) return Infinity
    if (threshold > 80) {
      return -threshold/2 + 50
    } else if (threshold > 30) {
      return -threshold + 90
    } else {
      return -10 * threshold + 360
    }
  }

  setForcedZoomThreshold(threshold) {
    this._forcedZoomThreshold = threshold
  }

  unsetForcedZoomThreshold(threshold) {
    this._forcedZoomThreshold = null
  }

  getZoomThreshold() {
    if (this._forcedZoomThreshold !== null) {
      return this._forcedZoomThreshold
    }
    return getSetting(ZOOM_THRESHOLD_SETTING)
  }

  setForcedPanThreshold(threshold) {
    this._forcedPanThreshold = threshold
  }

  unsetForcedPanThreshold(threshold) {
    this._forcedPanThreshold = null
  }

  getPanThreshold() {
    if (this._forcedPanThreshold !== null) {
      return this._forcedPanThreshold
    }
    return getSetting(PAN_THRESHOLD_SETTING)
  }

  calcPanCorrection(transform, touch) {
    const touchedPointOnWorldAfter = transform.applyInverse(touch.current)
    return Vectors.subtract(touchedPointOnWorldAfter, touch.world)
  }

  handleMultiFingerPan() {
    if (!FoundryCanvas.isPanAllowed()) {
      return
    }

    const touchIds = this.touchIds
    const adjustedTransform = FoundryCanvas.worldTransform

    const firstTouch = this.touches[touchIds[0]]
    if (this._panGesture.status == this.GESTURE_STATUSES.NONE) {
      this._panGesture.initiatingCoords = {...firstTouch.current}
      this._panGesture.status = this.GESTURE_STATUSES.WAITING
    }
    const currentDistance = Vectors.distance(firstTouch.current, this._panGesture.initiatingCoords)
    if (this._panGesture.status < this.GESTURE_STATUSES.ACTIVE) {
      if (currentDistance > this.panThresholdFunction(this.getPanThreshold())) {
        this._panGesture.status = this.GESTURE_STATUSES.ACTIVE
      }
    }

    if (this._panGesture.status == this.GESTURE_STATUSES.ACTIVE) {
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
  }

  panThresholdFunction(threshold) {
    if (threshold == 0) return Infinity
    if (threshold > 50) {
      return -4/5 * threshold + 80
    } else if (threshold > 20) {
      return -2 * threshold + 140
    } else {
      return -10 * threshold + 300
    }
  }

  useSplitGestures() {
    return getSetting(GESTURE_MODE_SETTING) === GESTURE_MODE_SPLIT
  }

  useNoGestures() {
    return getSetting(GESTURE_MODE_SETTING) === GESTURE_MODE_OFF
  }

  isTouchPointerEvent(event) {
    return super.isTouchPointerEvent(event) || event.touchvttTrusted
  }

  gesturesEnabled() {
    return this._gesturesEnabled && !this.useNoGestures()
  }

}

CanvasTouchPointerEventsManager.init = function init(element) {
  return new CanvasTouchPointerEventsManager(element)
}

export default CanvasTouchPointerEventsManager
