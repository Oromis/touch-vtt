import {MODULE_NAME} from '../config/ModuleConstants'
import {LARGE_BUTTONS_SETTING} from '../config/TouchSettings'

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

function createStyleElement() {
  const style = document.createElement('style')
  style.setAttribute('id', STYLE_ID)
  document.head.append(style)
  return style
}

export function updateButtonSize(useLargeButtons) {
  const style = document.getElementById(STYLE_ID)
  if (style != null) {
    if (useLargeButtons) {
      style.innerText = largeButtonStyle
    } else {
      style.innerText = ''
    }
  }
}

export function initEnlargeButtonTool() {
  createStyleElement()
  updateButtonSize(game.settings.get(MODULE_NAME, LARGE_BUTTONS_SETTING) || false)
}
