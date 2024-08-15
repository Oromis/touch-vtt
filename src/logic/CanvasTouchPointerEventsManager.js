import {dispatchCopy, dispatchModifiedEvent} from "./FakeTouchEvent.js"
import Vectors from './Vectors.js'
import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import Screen from '../browser/Screen.js'
import {getSetting, ZOOM_SENSITIVITY_SETTING, GESTURE_MODE_SETTING, GESTURE_MODE_SPLIT, GESTURE_MODE_OFF} from '../config/TouchSettings.js'
import TouchPointerEventsManager from './TouchPointerEventsManager.js'

// This class is similar in structure to the original CanvasTouchToMouseAdapter, but it doesn't capture/prevent events
// It only hooks into the PointerEvents and tracks them for specific fixes (by dispatching additional events) and multi-touch management

class CanvasTouchPointerEventsManager extends TouchPointerEventsManager {
  constructor(element) {
    super(element)

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

  onStartMultiTouch(event) {
    if (this.gesturesEnabled()) {
      // This is to cancel any drag-style action (usually a selection rectangle) when we start having multiple touches
      const cancelEvent = new MouseEvent("contextmenu", {clientX: 0, clientY: 0, bubbles: true, cancelable: true, view: window, button: 2})
      event.target.dispatchEvent(cancelEvent)
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

  calcZoom(firstTouch, secondTouch) {
    const originalScreenDistance = Vectors.distance(firstTouch.start, secondTouch.start)
    const originalWorldDistance = Vectors.distance(firstTouch.world, secondTouch.world)
    const originalScale = originalScreenDistance / originalWorldDistance
    const newScreenDistance = Vectors.distance(firstTouch.current, secondTouch.current)
    const newScale = newScreenDistance / originalWorldDistance
    if (Math.abs(newScale - originalScale) > 0.015) {
      return newScale
    } else {
      return originalScale
    }
  }

  calcPanCorrection(transform, touch) {
    const touchedPointOnWorldAfter = transform.applyInverse(touch.current)
    return Vectors.subtract(touchedPointOnWorldAfter, touch.world)
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
