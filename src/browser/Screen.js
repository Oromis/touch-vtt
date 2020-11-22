class Screen {
  get center() {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    }
  }

  get size() {
    return {
      x: window.innerWidth,
      y: window.innerHeight
    }
  }

  toRelativeCoordinates({ x, y }) {
    const size = this.size
    return {
      x: x / size.x,
      y: y / size.y
    }
  }
}

export default new Screen()
