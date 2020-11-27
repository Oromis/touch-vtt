function bitCodeMouseButton(button) {
  switch (button) {
    case 0:
      return 1  // Primary (left) mouse button
    case 1:
      return 4  // Auxiliary (middle) mouse button
    case 2:
      return 2  // Secondary (right) mouse button
    case 3:
      return 8  // "Back" button
    case 4:
      return 16 // "Forward" button
    default:
      return 0  // No button pressed
  }
}

export function dispatchFakeEvent(originalEvent, touch, mouseButton, type, target = touch.target) {
  const mouseEventInitProperties = {
    clientX: touch.clientX,
    clientY: touch.clientY,
    screenX: touch.screenX,
    screenY: touch.screenY,
    ctrlKey: originalEvent.ctrlKey || false,
    altKey: originalEvent.altKey || false,
    shiftKey: originalEvent.shiftKey || false,
    metaKey: originalEvent.metaKey || false,
    button: mouseButton,
    buttons: bitCodeMouseButton(mouseButton),
    relatedTarget: originalEvent.relatedTarget || null,
    region: originalEvent.region || null,
    detail: 0,
    view: window,
    sourceCapabilities: originalEvent.sourceCapabilities,
    eventInit: {
      bubbles: true,
      cancelable: true,
      composed: true,
    },
  }

  let simulatedEvent
  if (type.indexOf('mouse') === 0) {
    simulatedEvent = new MouseEvent(type, mouseEventInitProperties)
  } else {
    const pointerEventInit = {
      pointerId: touch.identifier,
      pointerType: 'mouse',
      isPrimary: true,
      ...mouseEventInitProperties,
    }
    simulatedEvent = new PointerEvent(type, pointerEventInit)
  }
  target.dispatchEvent(simulatedEvent)
}

export function fakeTouchEvent(originalEvent, touch, mouseButton, eventMap, target = null) {
  if (originalEvent == null || typeof originalEvent !== 'object') {
    console.warn(`Passed invalid event argument to fakeTouchEvent: ${originalEvent}`)
    return
  }

  const types = eventMap[originalEvent.type]

  for (const type of types) {
    dispatchFakeEvent(originalEvent, touch, mouseButton, type, target || touch.target)
  }
}
