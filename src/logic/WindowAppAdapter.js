import {dispatchModifiedEvent} from './FakeTouchEvent.js'
import {wrapMethod} from '../utils/Injection'
import {MODULE_NAME} from '../config/ModuleConstants'
import Vectors from './Vectors.js'
import AppTouchPointerEventsManager from './AppTouchPointerEventsManager.js'

// Drag and Drop polyfill for touch events (https://github.com/Bernardo-Castilho/dragdroptouch)
import '../utils/DragDropTouch.js'

const STYLE_ID = `${MODULE_NAME}-draggable_apps_styles`

const appStyle = `
.app, .application {
  touch-action: none;
}

.app .window-header, .application .window-header, .app .window-title, .application .window-title {
  touch-action: none;
}

.directory-item .handlebar {
  display: none;
  flex: 0 0 20px;
  align-self: center;
  font-size: 1.6em;
  z-index: 10;
}

.directory-item.document .handlebar {
  height: var(--sidebar-item-height);
  padding: 14px 0 0 4px;
}

.directory-item.folder .handlebar {
  line-height: 24px;
  margin: 0 4px 0 0;
}

.directory-item.compendium .handlebar {
  position: absolute;
  left: 6px;
}

body.touchvtt-using-touch .directory-item.compendium {
  flex-direction: row;
}

body.touchvtt-using-touch .directory-item.compendium .compendium-banner {
  pointer-events: none;
}

body.touchvtt-using-touch .directory-item .handlebar {
  display: flex;
}
`

function createStyleElement() {
  const style = document.createElement('style')
  style.setAttribute('id', STYLE_ID)
  style.innerHTML = appStyle
  document.head.append(style)
  return style
}

class WindowAppAdapter {
  constructor() {
    this.lastClickInfo = {target: null, time: 0, touch: false}
    this.touchManager = AppTouchPointerEventsManager.init(".app, .application")

    this.lastPointerDownCoords = null

    /*** Double-click management - Start ***/
    // In both v11 and v12 (but in an especially weird way in v11) double clicks on app windows are triggered inconsistently for touch events
    // In v12, touching a window header triggers a dblclick
    // In v11, when rendered, double touching the header doesn't triggere a dblclick (I assume it's some interaction with the draggable),
    // but after double touching a different section of the window, the behavior becomes the same as v12
    // The brutal approach here is to just hijack and cancel any dblclick event on an app, and create our own as best as we can

    // Reminder: this would be cleaner using evt.sourceCapabilities.firesTouchEvents, but it's not supported by Firefox and Safari yet.
    // If updated in the future, we don't need to keep track of lastClickInfo.touch anymore, and we just filter by that in both listeners.

    // Cancel any native dblclick event on apps
    document.body.addEventListener("dblclick", (evt) => {
      const isInApp = !!evt.target.closest(".app, .application")
      if (evt.isTrusted && isInApp && this.lastClickInfo.touch) { // we only cancel native dblclick if the last click we received was touch-based
        evt.preventDefault()
        evt.stopImmediatePropagation()
        evt.stopPropagation()
        return false
      }
    }, true)

    // Manage click events and decide if we trigger an artificial double click
    document.body.addEventListener("click", (evt) => {
      if (!!evt.target.closest(".app, .application")) {
        this.manageTouchDblClick.call(this, evt)
      }
    })

    /*** Double-click management - End ***/
    
    // Avoid error on Drag and Drop polyfill
    wrapMethod('DragDrop.prototype._handleDragStart', function(originalMethod, event) {
    if (event.dataTransfer.items) {
      return originalMethod.call(this, event)
    } else {
      this.callback(event, "dragstart")
      if ( Object.keys(event.dataTransfer._data).length ) event.stopPropagation()
    }
    }, 'MIXED')

    /**** Fix for pf2e combat tracker sortable - START */
    // We intercept/cancel touch move events between pointerdown and pointerup
    const cancelMoveEvent = ((evt) => {
      const evtCoords = {x: evt.clientX || evt.touches?.[0]?.clientX, y: evt.clientY || evt.touches?.[0]?.clientY}
      if (Vectors.distance(evtCoords, this.lastPointerDownCoords) < 10) {
        evt.preventDefault()
        evt.stopPropagation()
        evt.stopImmediatePropagation()
        return false
      }
    }).bind(this)
    document.addEventListener("pointerdown", evt => {
      if (evt.target.closest("#combat-tracker")) {
        this.lastPointerDownCoords = {x: evt.clientX, y: evt.clientY}
        Array("pointermove", "touchmove", "mousemove").forEach(e => {
          document.getElementById("combat-tracker").addEventListener(e, cancelMoveEvent, true)
        })
      }
    }, true)
    document.addEventListener("pointerup", evt => {
      if (evt.target.closest("#combat-tracker")) {
        this.lastPointerDownCoords = null
        Array("pointermove", "touchmove", "mousemove").forEach(e => {
          document.getElementById("combat-tracker").removeEventListener(e, cancelMoveEvent, true)
        })
      }
    }, true)
    /**** Fix for pf2e combat tracker sortable - END */
  }

  manageTouchDblClick(clickEvent) {
    const isTouch = ["touch", "pen"].includes(clickEvent.pointerType)
    if (isTouch && Date.now() - this.lastClickInfo.time < 500 && clickEvent.target == this.lastClickInfo.target) {
      dispatchModifiedEvent(clickEvent, "dblclick")
      this.lastClickInfo = {target: null, time: 0, touch: isTouch}
    }
    this.lastClickInfo = {target: clickEvent.target, time: Date.now(), touch: isTouch}
  }

  fixDirectoryScrolling(directory, usingTouch) {
    const directoryList = directory.element.find(".directory-list")
    if (directoryList.length > 0) {
      if (!usingTouch) {
        directoryList.find(".directory-item .handlebar").remove()
        directoryList.find(`li[draggable="false"].directory-item`).each(function(index, element) {
          element.draggable = true
        })
      } else {
        directoryList.find(`li[draggable="true"].directory-item`).each(function(index, element) {
          element.draggable = false
          let handlebar = document.createElement("i")
          handlebar.className = "handlebar fas fa-grip-vertical";
          handlebar.addEventListener("pointerdown", e => {
            element.draggable = true
          }, true)
          handlebar.addEventListener("pointerup", e => {
            if (["touch", "pen"].includes(e.pointerType)) {
              element.draggable = false
            }
          }, true)
          if (element.classList.contains("folder")) {
            element.getElementsByTagName("header")[0].prepend(handlebar)
          } else {
            element.prepend(handlebar)
          }
        })
      }

    }
  }

}

WindowAppAdapter.init = function init() {
  createStyleElement()
  return new WindowAppAdapter()
}

export default WindowAppAdapter
