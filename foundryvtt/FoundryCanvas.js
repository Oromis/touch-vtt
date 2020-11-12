class FoundryCanvas {
  get raw() {
    return canvas
  }

  get zoom() {
    return this.raw.stage.scale.x
  }

  pan({ x, y, zoom }) {
    this.raw.pan({ x, y, scale: zoom })
  }

  screenToWorld({ x, y }) {
    return this.raw.stage.transform.worldTransform.applyInverse({ x, y })
  }

  worldToScreen({ x, y }) {
    return this.raw.stage.transform.worldTransform.apply({ x, y })
  }

  toRelativeCoordinates({ x, y }) {
    const size = this.worldSize
    return {
      x: x / size.x,
      y: y / size.y
    }
  }

  get worldSize() {
    return {
      x: this.raw.scene.data.width,
      y: this.raw.scene.data.height,
    }
  }

  get worldCenter() {
    const size = this.worldSize
    return {
      x: size.x / 2,
      y: size.y / 2,
    }
  }
}

export default new FoundryCanvas()
