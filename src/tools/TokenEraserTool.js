export function installTokenEraser(menuStructure) {

  if (game.user.isGM) {
    const category = menuStructure.find(c => c.name === 'token')
    if (category == null || !Array.isArray(category.tools)) return

    category.tools.push({
      // Simulate hitting del with a token selected
      name: 'Delete',
      title: 'TOUCHVTT.DeleteToken',
      icon: 'fas fa-eraser',
      button: true,
      onClick: () => canvas.tokens._onDeleteKey()
    })
  }
}
