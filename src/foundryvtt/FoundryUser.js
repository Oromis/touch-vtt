class FoundryUser {
  get isGm() {
    return this.raw.isGM
  }

  get raw() {
    return game.user
  }
}

export default new FoundryUser()
