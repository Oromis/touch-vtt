import {MODULE_NAME} from "../config/ModuleConstants"
import {getSetting, LARGE_BUTTONS_SETTING} from "../config/TouchSettings"

const STYLE_ID = `${MODULE_NAME}-bug_button_styles`
// CSS needed to be more specific. Unsure if just using !important would be better
const largeButtonStyle = `
#controls ol.control-tools > li.scene-control, #controls ol.control-tools > li.control-tool {
    width: 50px;
    height: 50px;
    line-height: 50px;
    font-size: 28px;
}
#controls ol.control-tools {
    left: 72px;
}
#ui-left, #ui-left .ui-control {
  --control-size: 50px;
}
`

function createStyleElement() {
  const style = document.createElement("style")
  style.setAttribute("id", STYLE_ID)
  document.head.append(style)
  return style
}

export function updateButtonSize(useLargeButtons) {
  const style = document.getElementById(STYLE_ID)
  if (style != null) {
    if (useLargeButtons) {
      style.innerHTML = largeButtonStyle
    } else {
      style.innerHTML = ""
    }
  }
}

export function initEnlargeButtonTool() {
  createStyleElement()
  updateButtonSize(getSetting(LARGE_BUTTONS_SETTING) || false)
}
