import {wrapMethod} from "../utils/Injection.js"
import {addSceneControlButton} from "../foundryvtt/FoundryUtils"

// Local storage for GUI toggles, since they shouldn't be saved over reloads
let chainingActive = false

function installChainingHook() {
  // Hook into the wall layer's listeners for some ugly fixes

  // We do this because when we do a wall chain in the current solution, the combination of touchend and pointerups is messing stuff up
  // In particular, the original method here calls .preventDefault() on one of these PIXI events and then for some reason it's stuck.
  // Which means that all subsequent events are `defaultPrevented` and they misbehave.
  // So what we do here is, when the wall/chain is done, literally set that field to false. Luckily this actually works.
  // Even more luckily, this also fixes a similar issue in v12

  const wallsLayerPath = game.release.generation < 13 ? "WallsLayer" : "foundry.canvas.layers.WallsLayer"

  wrapMethod(`${wallsLayerPath}.prototype._onDragLeftCancel`, function(callOriginal, ...args) {
    const result = callOriginal(...args)
    if (args[0] instanceof PIXI.FederatedEvent) {
      args[0].defaultPrevented = false
    }
    return result
  }, "MIXED")

}

export function installWallToolsControls(menuStructure) {
  addSceneControlButton(menuStructure, "walls", {
    // Simulates holding ctrl while drawing walls
    name: "tile",
    title: "TOUCHVTT.ToggleWallChain",
    icon: "fas fa-link",
    toggle: true,
    active: chainingActive,
    onChange: (event, active) => chainingActive = active
  })
  addSceneControlButton(menuStructure, "walls", {
    // Simulates hitting Ctrl-Z
    name: "undo",
    title: "TOUCHVTT.UndoWall",
    icon: "fas fa-undo",
    button: true,
    onClick: () => canvas.walls.undoHistory(),
    onChange: () => canvas.walls.undoHistory()
  })
  addSceneControlButton(menuStructure, "walls", {
    // Simulate hitting del with a wall selected
    name: "Delete",
    title: "TOUCHVTT.DeleteWall",
    icon: "fas fa-eraser",
    button: true,
    onClick: () => canvas.walls._onDeleteKey(),
    onChange: () => canvas.walls._onDeleteKey()
  })
}

export function callbackForWallTools(modifier) {
  if (modifier === KeyboardManager.MODIFIER_KEYS.CONTROL && ui.controls.control.name == "walls" && chainingActive) {
    return true
  } else {
    return false
  }
}

export function initWallTools() {
  installChainingHook()
}
