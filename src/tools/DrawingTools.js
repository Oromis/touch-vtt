import {addSceneControlButton} from "../foundryvtt/FoundryUtils"

export function installDrawingToolsControls(menuStructure) {
  addSceneControlButton(menuStructure, "drawings", {
    // Simulate hitting del with a drawing selected
    name: "Delete",
    title: "TOUCHVTT.DeleteDrawing",
    icon: "fas fa-eraser",
    button: true,
    onClick: () => canvas.drawings._onDeleteKey(),
    onChange: () => canvas.drawings._onDeleteKey()
  })
}
