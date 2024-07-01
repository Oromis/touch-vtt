import {MODULE_NAME} from '../config/ModuleConstants'
const STYLE_ID = `${MODULE_NAME}-draggable_apps_styles`

const draggableAppStyle = `
.app {
  touch-action: none;
}
`
function createStyleElement() {
  const style = document.createElement('style')
  style.setAttribute('id', STYLE_ID)
  style.innerHTML = draggableAppStyle
  document.head.append(style)
  return style
}

export function initDraggableAppsTool() {
  createStyleElement()
}
