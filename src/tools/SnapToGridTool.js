let isActive = true

export function isSnapToGridEnabled() {
  return isActive
}

export function installSnapToGrid(menuStructure) {
  const measurementCategory = menuStructure.find(c => c.name === 'token')
  if (measurementCategory != null) {
    measurementCategory.tools.push({
      name: 'snap',
      title: 'TOUCHVTT.SnapToGrid',
      icon: 'fas fa-border-all',
      toggle: true,
      active: isActive,
      onClick: active => isActive = active
    })
  }
}
