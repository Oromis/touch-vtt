import {addSceneControlButton} from "../foundryvtt/FoundryUtils"

let isActive = true

export function isSnapToGridEnabled() {
  return isActive
}

export function installSnapToGrid(menuStructure) {
  addSceneControlButton(menuStructure, "tokens", {
    name: "snap",
    title: "TOUCHVTT.SnapToGrid",
    icon: "fas fa-border-all",
    toggle: true,
    active: isActive,
    onChange: (event, active) => { isActive = active }
  })
}

// The logic for this was originally in the FakeTouchEvent module (not used in v12), having it here seems clearer anyway.
export function callbackForSnapToGrid(event, events) {
  if (event.startsWith("dragLeft") && !isActive) {
    events.forEach(e => {
      e.shiftKey = true
    })
  }
}
