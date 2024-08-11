import TouchPointerEventsManager from './TouchPointerEventsManager.js'

class AppTouchPointerEventsManager extends TouchPointerEventsManager {
  constructor(selector) {
    super(selector)
    this.selector = selector
    this.scrollStart = null
  }

  contextMenuCanceler(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  handleTouchMove(event) {
    this.updateActiveTouch(event)

    switch (this.touchIds.length) {
      case 2:
      case 3:
      case 4:
        if (this.gesturesEnabled()) {
          this.handleMultiFingerScroll(event)
        }
        break
      default:
    }
  }

  handleTouchEnd(event) {
    this.cleanUpTouch(event)
    this.scrollStart = null
    document.removeEventListener("contextmenu", this.contextMenuCanceler, true)
  }

  handleMultiFingerScroll() {
    document.addEventListener("contextmenu", this.contextMenuCanceler, true)
    const touchIds = this.touchIds
    const firstTouch = this.touches[touchIds[0]]

    const scrollable = this.findFirstScrollableParent(firstTouch.target)
    if (scrollable) {
      if (!this.scrollStart) {
        this.scrollStart = scrollable.scrollTop
      }
      scrollable.scrollTop = this.scrollStart + firstTouch.start.y - firstTouch.current.y
    }
  }

  findFirstScrollableParent(element) {
    let found = null
    while (!found && element?.closest(this.selector)) {
      if (element.scrollHeight > element.clientHeight + 50) {
        found = element
      }
      element = element.parentElement
    }
    return found
  }

}

AppTouchPointerEventsManager.init = function init(element) {
  return new AppTouchPointerEventsManager(element)
}

export default AppTouchPointerEventsManager
