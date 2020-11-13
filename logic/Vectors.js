class Vectors {
  add(a, b) {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
    }
  }

  subtract(a, b) {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
    }
  }

  divideElements(a, b) {
    return {
      x: a.x / b.x,
      y: a.y / b.y,
    }
  }

  distance(a, b) {
    const diff = this.subtract(a, b)
    return Math.sqrt((diff.x ** 2) + (diff.y) ** 2)
  }
}

export default new Vectors()
