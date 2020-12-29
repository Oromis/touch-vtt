export function idOf(event) {
  if (event.pointerId != null) {
    return event.pointerId
  } else if (event.touches != null && event.touches.length > 0) {
    return event.touches[0].identifier
  } else {
    return null
  }
}
