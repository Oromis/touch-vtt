class FoundryModules {
  isActive(key) {
    const module = game.modules.get(key)
    return module != null && module.active
  }
}

export default new FoundryModules()
