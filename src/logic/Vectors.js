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

  distanceSquared(a, b) {
    const diff = this.subtract(a, b)
    return this.lengthSquared(diff)
  }

  centerBetween(a, b) {
    const diff = this.subtract(a, b)
    return this.add(a, this.divideScalar(diff, 2))
  }

  centerOf(a, b, c) {
    const vectors = [a, b, c]
    const distances = [
      this.distanceSquared(a, b) + this.distanceSquared(a, c),
      this.distanceSquared(b, a) + this.distanceSquared(b, c),
      this.distanceSquared(c, a) + this.distanceSquared(c, b),
    ]

    const centerIndex = distances.reduce((acc, currentValue, currentIndex) => {
      return currentValue < acc.distance ?
        { index: currentIndex, distance: currentValue } :
        acc
    }, { distance: Number.MAX_VALUE, index: -1 }).index

    const otherIndices = vectors.map((e, i) => i)
    otherIndices.splice(centerIndex, 1)

    let result = vectors[centerIndex]
    for (const otherIndex of otherIndices) {
      const diff = this.subtract(vectors[centerIndex], vectors[otherIndex])
      result = this.add(result, this.divideScalar(diff, 2))
    }
    return result
  }

  length(vector) {
    return Math.sqrt((vector.x ** 2) + (vector.y ** 2))
  }

  lengthSquared(vector) {
    return (vector.x ** 2) + (vector.y ** 2)
  }

  abs(vector) {
    return {
      x: Math.abs(vector.x),
      y: Math.abs(vector.y),
    }
  }

  isEqual(a, b) {
    return a.x === b.x && a.y === b.y
  }
}

export default new Vectors()
