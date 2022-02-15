import {wrapMethod} from '../utils/Injection.js'

// Local storage for GUI toggles, since they shouldn't be saved over reloads
let chainingActive = false

function installChainingHook() { // Monkey patch click function to force this._chain when chainingActive is set
  wrapMethod('WallsLayer.prototype._onClickLeft', function(callOriginal, ...args) {
    const result = callOriginal(...args)
    if (chainingActive) {
      this._chain = true
    }
    return result
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

export function initWallTools() {
  installChainingHook()
}
