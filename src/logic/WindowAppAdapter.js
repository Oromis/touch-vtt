import {dispatchModifiedEvent} from './FakeTouchEvent.js'
import {wrapMethod} from '../utils/Injection'
import {MODULE_NAME} from '../config/ModuleConstants'

// Drag and Drop polyfill for touch events (https://github.com/Bernardo-Castilho/dragdroptouch)
import '../utils/DragDropTouch.js'

const STYLE_ID = `${MODULE_NAME}-draggable_apps_styles`

const draggableAppStyle = `
.app, .app .window-header, .app .window-title {
  touch-action: none;
}
`

function createStyleElement() {
  const style = document.createElement('style')
  style.setAttribute('id', STYLE_ID)
  style.innerHTML = draggableAppStyle
  document.head.append(style)
  return style
}

class WindowAppAdapter {
  constructor() {
    this.lastClickInfo = {target: null, time: 0}

    /*** Double-click management - Start ***/
    // In both v11 and v12 (but in an especially weird way in v11) double clicks on app windows are triggered inconsistently for touch events
    // In v12, touching a window header triggers a dblclick
    // In v11, when rendered, double touching the header doesn't triggere a dblclick (I assume it's some interaction with the draggable),
    // but after double touching a different section of the window, the behavior becomes the same as v12
    // The brutal approach here is to just hijack and cancel any dblclick event on an app, and create our own as best as we can

    // Cancel any native dblclick event on apps
    document.body.addEventListener("dblclick", (evt) => {
      const isInApp = !!evt.target.closest(".app")
      if (evt.isTrusted && isInApp) {
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
    if (clickEvent.pointerType == "touch" && Date.now() - this.lastClickInfo.time < 500 && clickEvent.target == this.lastClickInfo.target) {
      dispatchModifiedEvent(clickEvent, "dblclick")
      this.lastClickInfo = {target: null, time: 0}
    }
    this.lastClickInfo = {target: clickEvent.target, time: Date.now()}
  }
}

WindowAppAdapter.init = function init() {
  createStyleElement()
  return new WindowAppAdapter()
}

export default WindowAppAdapter
