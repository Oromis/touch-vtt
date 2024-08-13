import {wrapMethod} from '../utils/Injection.js'

// Local storage for GUI toggles, since they shouldn't be saved over reloads
let chainingActive = false

function installChainingHook() {
  // Hook into the wall layer's listeners for some ugly fixes

  // We do this because when we do a wall chain in the current solution, the combination of touchend and pointerups is messing stuff up
  // In particular, the original method here calls .preventDefault() on one of these PIXI events and then for some reason it's stuck.
  // Which means that all subsequent events are `defaultPrevented` and they misbehave.
  // So what we do here is, when the wall/chain is done, literally set that field to false. Luckily this actually works.
  // Even more luckily, this also fixes a similar issue in v12
  wrapMethod('WallsLayer.prototype._onDragLeftCancel', function(callOriginal, ...args) {
    const result = callOriginal(...args)
    if (args[0] instanceof PIXI.FederatedEvent) {
      args[0].defaultPrevented = false
    }
    return result
  }, 'MIXED')

}

export function installWallToolsControls(menuStructure) {
  const wallCategory = menuStructure.find(c => c.name === 'walls')
  if (wallCategory == null || !Array.isArray(wallCategory.tools)) return

  wallCategory.tools.push({
    // Simulates holding ctrl while drawing walls
    name: 'tile',
    title: 'TOUCHVTT.ToggleWallChain',
    icon: 'fas fa-link',
    toggle: true,
    active: chainingActive,
    onClick: active => chainingActive = active
  }, {
    // Simulates hitting Ctrl-Z
    name: 'undo',
    title: 'TOUCHVTT.UndoWall',
    icon: 'fas fa-undo',
    button: true,
    onClick: () => canvas.walls.undoHistory()
  }, {
    // Simulate hitting del with a wall selected
    name: 'Delete',
    title: 'TOUCHVTT.DeleteWall',
    icon: 'fas fa-eraser',
    button: true,
    onClick: () => canvas.walls._onDeleteKey()
  })
}

export function callbackForWallTools(modifier) {
  if (modifier === KeyboardManager.MODIFIER_KEYS.CONTROL && ui.controls.activeControl == "walls" && chainingActive) {
    return true
  } else {
    return false
  }
}

export function initWallTools() {
  installChainingHook()
}
