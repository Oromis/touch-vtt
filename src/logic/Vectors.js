class Vectors {
  get zero() {
    return { x: 0, y: 0 }
  }

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

  multiplyElements(a, b) {
    return {
      x: a.x * b.x,
      y: a.y * b.y,
    }
  }

  divideElements(a, b) {
    return {
      x: a.x / b.x,
      y: a.y / b.y,
    }
  }

  divideScalar(vector, scalar) {
    return {
      x: vector.x / scalar,
      y: vector.y / scalar,
    }
  }

  distance(a, b) {
    const diff = this.subtract(a, b)
    return this.length(diff)
  }

  centerBetween(a, b) {
    const diff = this.subtract(a, b)
    return this.add(a, this.divideScalar(diff, 2))
  }

  length(vector) {
    return Math.sqrt((vector.x ** 2) + (vector.y) ** 2)
  }
}

export default new Vectors()
