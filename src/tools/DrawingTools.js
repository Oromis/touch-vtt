export function installDrawingToolsControls(menuStructure) {
  const category = menuStructure.find(c => c.name === 'drawings')
  if (category == null || !Array.isArray(category.tools)) return

  category.tools.push({
    // Simulate hitting del with a drawing selected
    name: 'Delete',
    title: 'TOUCHVTT.DeleteDrawing',
    icon: 'fas fa-eraser',
    button: true,
    onClick: () => canvas.drawings._onDeleteKey()
  })
}
