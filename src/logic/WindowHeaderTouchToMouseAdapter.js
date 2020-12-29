import TouchToMouseAdapter from './TouchToMouseAdapter.js'

const START_EVENT = 'touchstart'
const MOVE_EVENT = 'touchmove'
const END_EVENT = 'touchend'

class WindowHeaderTouchToMouseAdapter extends TouchToMouseAdapter {
  constructor(element) {
    super(element)
    console.log(`Creating window header mouse adapter for ${element}`)

    this.dragging = false
  }

  getEventTarget(event) {
    if (event.type === END_EVENT) {
      return this.getParentByClass(event.target, 'window-header')
    } else {
      return window
    }
  }

  shouldHandleEvent(event) {
    if (event.type === START_EVENT) {
      const inWindowTitle = this.isInWindowTitle(event.target)
      if (inWindowTitle) {
        this.dragging = true
      }
      return inWindowTitle
    } else if (this.dragging && event.type === END_EVENT) {
      this.dragging = false
      return true
    } else {
      return this.dragging
    }
  }

  isInWindowTitle(element) {
    return this.getParentByClass(element, 'window-title') != null
  }

  getEventMap() {
    return {
      [START_EVENT]: ['mousedown'],
      [MOVE_EVENT]: ['mousemove'],
      [END_EVENT]: ['mouseup'],
    }
  }

  getParentByClass(element, className) {
    if (element.classList.contains(className)) {
      return element
    } else if (element.parentElement == null) {
      return null
    } else {
      return this.getParentByClass(element.parentElement, className)
    }
  }
}

WindowHeaderTouchToMouseAdapter.init = function init(element) {
  return new WindowHeaderTouchToMouseAdapter(element)
}

export default WindowHeaderTouchToMouseAdapter
