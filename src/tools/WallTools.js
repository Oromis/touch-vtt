import {wrapMethod} from '../utils/Injection.js'

// Local storage for GUI toggles, since they shouldn't be saved over reloads
let chainingActive = false

function installChainingHook() {
  // Hook into the wall layer's listeners for some ugly fixes

  // This is to stop an unwanted dragLeftCancel coming from an unwanted pointerup in v11
  if (game.release.generation < 12) {
    wrapMethod('WallsLayer.prototype._onDragLeftCancel', function(callOriginal, ...args) {
      if (args[0] instanceof PointerEvent) {
        args[0].preventDefault()
        return
      }
      return callOriginal(...args)
    }, 'MIXED')
  }

  // Trigger a dragLeftStart after every clickLeft (for some reason it's not triggered automatically after finishing a chain)
  wrapMethod('WallsLayer.prototype._onClickLeft', function(callOriginal, ...args) {
    callOriginal(...args)
    return this._onDragLeftStart(...args)
  })
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
