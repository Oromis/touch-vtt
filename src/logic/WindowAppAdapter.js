import {dispatchModifiedEvent} from './FakeTouchEvent.js'
import {wrapMethod} from '../utils/Injection'
import {MODULE_NAME} from '../config/ModuleConstants'

// Drag and Drop polyfill for touch events (https://github.com/Bernardo-Castilho/dragdroptouch)
import '../utils/DragDropTouch.js'

const STYLE_ID = `${MODULE_NAME}-draggable_apps_styles`

const draggableAppStyle = `
.app {
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

    // Artificial double clicks
    $(document.body).on("click", ".app", this.manageTouchDblClick.bind(this))

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
