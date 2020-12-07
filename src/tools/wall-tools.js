import {injectMethodCondition, replaceMethod} from '../utils/Injection.js'

Hooks.once("init", registerSettings)

Hooks.on("getSceneControlButtons", addControls)

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
        button: true,
        onClick: () => {
            window.document.styleSheets[0].insertRule("#controls .control-tool, #controls .scene-control {width: 59px;height: 59px; font-size: 48px;line-height: revert;}", window.document.styleSheets[0].rules.length)
            window.document.styleSheets[0].insertRule("#controls .control-tools {left: 78px}", window.document.styleSheets[0].rules.length)
        }
    })


}

