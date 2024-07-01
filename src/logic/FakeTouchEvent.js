// Used to dispatch an artificial PointerEvent based on an original one, with optional customized buttons and position offset
// Starting from v1.13 the original event is not prevented anymore, we only do this as additions where necessary to fix stuff

export function dispatchModifiedEvent(originalEvent, newEventType = originalEvent.type, {button = originalEvent.button, buttons = originalEvent.buttons} = {}, offset = 0) {
  const mouseEventInitProperties = {
    clientX: originalEvent.clientX + offset,
    clientY: originalEvent.clientY + offset,
    screenX: originalEvent.screenX + offset,
    screenY: originalEvent.screenY + offset,
    ctrlKey: originalEvent.ctrlKey || false,
    altKey: originalEvent.altKey || false,
    shiftKey: originalEvent.shiftKey || false,
    metaKey: originalEvent.metaKey || false,
    button: button,
    buttons: buttons,
    relatedTarget: originalEvent.relatedTarget || null,
    region: originalEvent.region || null,
    detail: 0,
    view: window,
    sourceCapabilities: originalEvent.sourceCapabilities,
    bubbles: true,
    cancelable: true,
    composed: true,
  }

  const pointerEventInit = {
    pointerId: originalEvent.identifier,
    pointerType: 'mouse',
    isPrimary: true,
    ...mouseEventInitProperties,
  }

  var target = originalEvent.nativeEvent ? originalEvent.nativeEvent.target : originalEvent.target

  const pointermoveEvent = new PointerEvent(newEventType, pointerEventInit)
  //console.log("dispatching", pointermoveEvent)
  target.dispatchEvent(pointermoveEvent)
}
