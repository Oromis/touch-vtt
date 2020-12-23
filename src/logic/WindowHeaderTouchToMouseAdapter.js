import TouchToMouseAdapter from './TouchToMouseAdapter.js'

class WindowHeaderTouchToMouseAdapter extends TouchToMouseAdapter {
  constructor(element) {
    super(element)

    this.dragging = false
  }

  getEventTarget(event) {
    if (event.type === 'pointerdown') {
      return this.getParentByClass(event.target, 'window-header')
    } else {
      return window
    }
  }

  shouldHandleEvent(event) {
    if (event.type === 'pointerdown') {
      const inWindowTitle = this.isInWindowTitle(event.target)
      if (inWindowTitle) {
        this.dragging = true
      }
      return inWindowTitle
    } else if (this.dragging && event.type === 'pointerup') {
      this.dragging = false
      return true
    } else {
      return this.dragging
    }
  }

  isInWindowTitle(element) {
    return this.getParentByClass(element, 'window-title') != null
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
