import MouseButton from './MouseButton.js'

class TouchContext {
  constructor({ forwardingEvents = [], mouseButton = null } = {}) {
    this.forwardingEvents = forwardingEvents
    this.mouseButton = mouseButton
  }

  forwardsEvent(event) {
    return this.forwardingEvents.indexOf(event.type) !== -1
  }
}

const PRIMARY_CLICK = Object.freeze(new TouchContext({
  forwardingEvents: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
  mouseButton: MouseButton.left,
}))
const ZOOM_PAN_GESTURE = Object.freeze(new TouchContext())

export default Object.freeze({
  PRIMARY_CLICK,
  ZOOM_PAN_GESTURE,
})
