import FoundryCanvas from '../foundryvtt/FoundryCanvas.js'
import TouchContext from './TouchContext.js'

class Touch {
  constructor(touchSource, { context = TouchContext.PRIMARY_CLICK } = {}) {
    this.id = touchSource.identifier
    this.start = Object.freeze({ x: touchSource.clientX, y: touchSource.clientY })
    this.last = this.start
    this.current = this.last
    this.context = context
    this.clientX = touchSource.clientX
    this.clientY = touchSource.clientY
    this.screenX = touchSource.screenX
    this.screenY = touchSource.screenY
    this.target = touchSource.target

    this.world = FoundryCanvas.screenToWorld(this.current)  //< Position in the world where the user touched
  }

  get identifier() {
    return this.id
  }

  update(touchSource) {
    this.last = this.current
    this.current = Object.freeze({ x: touchSource.clientX, y: touchSource.clientY })
  }
}

export default Touch
