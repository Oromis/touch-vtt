import MouseButton from './MouseButton.js'

class TouchContext {
  constructor({ name, forwardingEvents = [], mouseButton = null, isFinal = true } = {}) {
    this.name = name
    this.forwardingEvents = forwardingEvents
    this.mouseButton = mouseButton
    this.isFinal = isFinal
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
  name: 'primary-click',
  forwardingEvents: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
  mouseButton: MouseButton.left,
  isFinal: false,
}))
const SECONDARY_CLICK = Object.freeze(new TouchContext({
  name: 'secondary-click',
  forwardingEvents: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
  mouseButton: MouseButton.right,
}))
const ZOOM_PAN_GESTURE = Object.freeze(new TouchContext({
  name: 'zoom-pan',
}))

export default Object.freeze({
  PRIMARY_CLICK,
  SECONDARY_CLICK,
  ZOOM_PAN_GESTURE,
})
