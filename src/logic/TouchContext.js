import MouseButton from './MouseButton.js'

class TouchContext {
  constructor({ forwardingEvents = [], mouseButton = null } = {}) {
    this.forwardingEvents = forwardingEvents
    this.mouseButton = mouseButton
  }

  forwardsEvent(event) {
    let eventType = event
    if (typeof event === 'object' && typeof event.type === 'string') {
      eventType = event.type
    }
    return this.forwardingEvents.indexOf(eventType) !== -1
  }
}

const PRIMARY_CLICK = Object.freeze(new TouchContext({
  forwardingEvents: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
  mouseButton: MouseButton.left,
}))
const SECONDARY_CLICK = Object.freeze(new TouchContext({
  forwardingEvents: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
  mouseButton: MouseButton.right,
}))
const ZOOM_PAN_GESTURE = Object.freeze(new TouchContext())

export default Object.freeze({
  PRIMARY_CLICK,
  SECONDARY_CLICK,
  ZOOM_PAN_GESTURE,
})
