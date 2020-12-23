import {replaceMethod} from '../utils/Injection.js'
import {MODULE_NAME} from '../config/ModuleConstants.js'

const STYLE_ID = `${MODULE_NAME}-bug_button_styles`
const largeButtonStyle = `
#controls .scene-control, #controls .control-tool {
    width: 50px;
    height: 50px;
    line-height: 50px;
    font-size: 28px;
}
#controls .control-tools {
    left: 72px;
}
`
// Local storage for GUI toggles, since they shouldn't be saved over reloads
let chainingActive = false
let largeButtons = false

Hooks.once('init', () => {
  createStyleElement()
  registerSettings()
})

Hooks.on('getSceneControlButtons', addControls)

function createStyleElement() {
  const style = document.createElement('style')
  style.setAttribute('id', STYLE_ID)
  document.head.append(style)
  return style
}

function updateButtonSize(button_size) {
  const style = document.getElementById(STYLE_ID)
  if (style != null) {
    if (button_size) {
      style.innerText = largeButtonStyle
    } else {
      style.innerText = ''
    }
  }
}


function registerSettings() { // Monkey patch click function to force this._chain when chainingActive is set
  replaceMethod(WallsLayer.prototype, '_onClickLeft', ({ callOriginal, self }) => {
    callOriginal()
    if (chainingActive) {
      self._chain = true
    }
  })
}

function addControls(menuStructure) {
  const wallCategory = menuStructure.find(c => c.name === 'walls')

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
    onClick: () => canvas.getLayer('WallsLayer').undoHistory()
  }, {
    // Simulate hitting del with a wall selected
    name: 'Delete',
    title: 'TOUCHVTT.DeleteWall',
    icon: 'fas fa-eraser',
    button: true,
    onClick: () => canvas.getLayer('WallsLayer')._onDeleteKey()
  }, {
    // This likely needs to move someplace else, but it's a useful touchscreen feature.
    name: 'big',
    title: 'TOUCHVTT.BigButton',
    icon: 'fas fa-expand-alt',
    visible: true,
    toggle: true,
    active: largeButtons,
    onClick: toggled => {
      updateButtonSize(toggled)
    }
  })
}

