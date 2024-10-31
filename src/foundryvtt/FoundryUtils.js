export function addSceneControlButton(menuStructure, category, button) {
  let menuCategory
  if (game.release.generation <= 12) {
    menuCategory = menuStructure.find(c => c.layer === category)
    if (menuCategory) {
        menuCategory.tools.push(button)
    }
  } else {
    menuCategory = menuStructure[category]
    if (menuCategory) {
        menuCategory.tools[button.name] = button
    }
  }
}