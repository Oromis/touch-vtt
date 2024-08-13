// Used to dispatch an artificial PointerEvent based on an original one, with optional customized buttons and position offset
// Starting from v1.13 the original event is not prevented anymore, we only do this as additions where necessary to fix stuff

export function dispatchModifiedEvent(originalEvent, newEventType = originalEvent.type, {trusted = true, button = originalEvent.button, buttons = originalEvent.buttons} = {}, offset = 0) {
  const mouseEventInitProperties = {
    clientX: (originalEvent.clientX || originalEvent.touches[0]?.clientX) + offset,
    clientY: (originalEvent.clientY || originalEvent.touches[0]?.clientY) + offset,
    screenX: (originalEvent.screenX || originalEvent.touches[0]?.screenX) + offset,
    screenY: (originalEvent.screenY || originalEvent.touches[0]?.screenY) + offset,
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
    pointerId: originalEvent.pointerId,
    pointerType: "mouse",
    isPrimary: true,
    ...mouseEventInitProperties,
  }
  
  var target = originalEvent.nativeEvent ? originalEvent.nativeEvent.target : originalEvent.target

  let pointerEvent
  if (newEventType.startsWith("mouse")) {
    pointerEvent = new MouseEvent(newEventType, mouseEventInitProperties)
  } else {
    pointerEvent = new PointerEvent(newEventType, pointerEventInit)
  }

  pointerEvent.touchvttTrusted = trusted

  //console.log("dispatching modified", pointerEvent, originalEvent)
  target.dispatchEvent(pointerEvent)
}

export function dispatchCopy(originalEvent) {
  let newEventObject = {}
  for (let key in originalEvent) {
    newEventObject[key] = originalEvent[key]
  }
  newEventObject.pointerType = "mouse"
  let newEvent = new originalEvent.constructor(originalEvent.type, newEventObject)
  newEvent.touchvttTrusted = true
  var target = originalEvent.nativeEvent ? originalEvent.nativeEvent.target : originalEvent.target

  //console.log("dispatching copied", newEvent, originalEvent)
  target.dispatchEvent(newEvent)
}
