import {injectMethodCondition, replaceMethod} from '../utils/Injection.js'
import {MODULE_NAME} from '../config/ModuleConstants.js'

const STYLE_ID = `${MODULE_NAME}-bug_button_styles`
const big_button_style =  `
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

let button_size = false
Hooks.once("init", () => {
    createStyleElement();
    registerSettings();
})   

Hooks.on("getSceneControlButtons", addControls)


function createStyleElement() {
    const style = document.createElement('style')
    style.setAttribute('id', STYLE_ID)
    document.head.append(style)
    return style
}

function updateButtonSize(button_size) {
    const style = document.getElementById(STYLE_ID)
    if (style != null) {
        if (button_size){
            style.innerText = big_button_style
        } else {
            style.innerText = ''
        }
    }
}
  


function registerSettings() { // Monkey patch click function to force this._chain when chainmode is set

    replaceMethod(WallsLayer.prototype, '_onClickLeft', ({callOriginal, self}) => {
        callOriginal()
        if (game.settings.get("touch-vtt", "CHAIN_WALLS")) {
            self._chain = true
        }
    })

    // Register setting to track controls toggle setting
    game.settings.register('touch-vtt', "CHAIN_WALLS", {
        scope: "world",
        type: Boolean,
        default: false,
        config: false
    });
}

function addControls(menuStructure) {
    const wallCategory = menuStructure.find(c => c.name === 'walls')

    wallCategory.tools.push({
        // Simulates holding ctrl while drawing walls
        name: "tile",
        title: "TOUCHVTT.ToggleWallChain",
        icon: "fas fa-link",
        toggle: true,
        active: game.settings.get("touch-vtt", "CHAIN_WALLS"),
        onClick: toggled => game.settings.set("touch-vtt", "CHAIN_WALLS", toggled)
    }, {
        // Simulates hitting Ctrl-Z
        name: "undo",
        title: "TOUCHVTT.UndoWall",
        icon: "fas fa-undo",
        button: true,
        onClick: () => canvas.getLayer("WallsLayer").undoHistory()
    }, {
        // Simulate hitting del with a wall selected
        name: "Delete",
        title: "TOUCHVTT.DeleteWall",
        icon: "fas fa-eraser",
        button: true,
        onClick: () => canvas.getLayer("WallsLayer")._onDeleteKey()
    }, {
        // This likely needs to move someplace else, but it's a useful touchscreen feature.
        name: "big",
        title: "TOUCHVTT.BigButton",
        icon: "fas fa-expand-alt",
        visible: true,
        toggle: true,
        active: button_size,
        onClick: toggled => {updateButtonSize(toggled)}
    })
}

