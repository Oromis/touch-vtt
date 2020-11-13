import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'

class Touch {
  constructor(touchSource) {
    this.id = touchSource.identifier
    this.start = Object.freeze({ x: touchSource.clientX, y: touchSource.clientY })
    this.last = this.start
    this.current = this.last

    this.world = FoundryCanvas.screenToWorld(this.current)  //< Position in the world where the user touched
  }

  update(touchSource) {
    this.last = this.current
    this.current = Object.freeze({ x: touchSource.clientX, y: touchSource.clientY })
  }
}

export default Touch
