import {addSceneControlButton} from '../foundryvtt/FoundryUtils'

export function installTokenEraser(menuStructure) {

  if (game.user.isGM) {
    addSceneControlButton(menuStructure, "tokens", {
      // Simulate hitting del with a token selected
      name: 'Delete',
      title: 'TOUCHVTT.DeleteToken',
      icon: 'fas fa-eraser',
      button: true,
      onClick: () => canvas.tokens._onDeleteKey(),
      onChange: () => canvas.tokens._onDeleteKey()
    })
  }
}
