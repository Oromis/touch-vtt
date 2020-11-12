class Touch {
  constructor(touchSource) {
    this.id = touchSource.identifier
    this.start = { x: touchSource.clientX, y: touchSource.clientY }
    this.last = this.start
  }

  update(touchSource) {
    this.last = { x: touchSource.clientX, y: touchSource.clientY }
  }
}

export default Touch
