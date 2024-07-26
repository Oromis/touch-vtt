import {dispatchModifiedEvent} from './FakeTouchEvent.js'
import {wrapMethod} from '../utils/Injection'
import {MODULE_NAME} from '../config/ModuleConstants'

// Drag and Drop polyfill for touch events (https://github.com/Bernardo-Castilho/dragdroptouch)
import '../utils/DragDropTouch.js'

const STYLE_ID = `${MODULE_NAME}-draggable_apps_styles`

const appStyle = `
.app .window-header, .application .window-header, .app .window-title, .application .window-title {
  touch-action: none;
}

.directory-list .scroll-buttons {
  display: none;
  position: sticky;
  bottom: 0;
  width: 100%;
  z-index: 10;
}

body.touchvtt-using-touch .directory-list .scroll-buttons {
  display: flex;
}

.scroll-buttons button {
  line-height: normal;
  padding-top: 4px;
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
    $(document.body).on("click", ".app", this.manageTouchDblClick.bind(this))

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
  }

  manageTouchDblClick(clickEvent) {
    const isTouch = ["touch", "pen"].includes(clickEvent.pointerType)
    if (isTouch && Date.now() - this.lastClickInfo.time < 500 && clickEvent.target == this.lastClickInfo.target) {
      dispatchModifiedEvent(clickEvent, "dblclick")
      this.lastClickInfo = {target: null, time: 0, touch: isTouch}
    }
    this.lastClickInfo = {target: clickEvent.target, time: Date.now(), touch: isTouch}
  }

  addDirectoryScrollButtons(directory) {
    const directoryList = directory.element.find(".directory-list")
    if (directoryList.length > 0) {
      const directoryListElem = directoryList.get(0)
      if (directoryListElem.scrollHeight <= directoryListElem.clientHeight || directoryListElem.clientHeight == 0) {
        directoryList.find(".scroll-buttons").remove()
      } else {
        if (directoryList.find(".scroll-buttons").length == 0) {
          const scrollUpButton = $("<button>")
            .html(`<i class="fas fa-angle-up"></i>`)
            .click(() => {
              directoryListElem.scroll({top: directoryListElem.scrollTop - 50, left: 0, behavior: "smooth"})
            })
          const scrollDownButton = $("<button>")
            .html(`<i class="fas fa-angle-down"></i>`)
            .click(() => {
              directoryListElem.scroll({top: directoryListElem.scrollTop + 50, left: 0, behavior: "smooth"})
            })
          const scrollButtonsArea = $("<div>")
            .attr("class", "scroll-buttons")
            .append(scrollUpButton)
            .append(scrollDownButton)
          directoryList.append(scrollButtonsArea)
        }
      }
    }
  }
}

WindowAppAdapter.init = function init() {
  createStyleElement()
  return new WindowAppAdapter()
}

export default WindowAppAdapter
