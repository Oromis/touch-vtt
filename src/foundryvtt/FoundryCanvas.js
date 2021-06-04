import ObjectUtils from '../utils/ObjectUtils.js'
import FoundryUser from './FoundryUser.js'
import FoundryModules from './FoundryModules.js'

const LOCK_VIEW_KEY = 'LockView'

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

  zoom(scale) {
    this.raw.pan({ scale })
  }

  get worldTransform() {
    return this.raw.stage.transform.worldTransform
  }

  screenToWorld({ x, y }) {
    return this.worldTransform.applyInverse({ x, y })
  }

  worldToScreen({ x, y }) {
    return this.worldTransform.apply({ x, y })
  }

  worldToScreenLength(length) {
    return this.worldTransform.apply({ x: length, y: 0 }).x - this.worldTransform.apply({ x: 0, y: 0 }).x
  }

  getWorldTransformWith({ zoom }, { discrete = true } = {}) {
    const copy = ObjectUtils.cloneObject(this.worldTransform)
    if (discrete) {
      zoom = Math.round(zoom * 100) / 100  //< PIXI rounds zoom values to 2 decimals for some reason
    }

    // No rotation => we can just assign the zoom level to the matrix' diagonal
    copy.a = copy.d = zoom
    return copy
  }

  get gridSize() {
    return this.raw.grid.size
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

  isZoomAllowed() {
    if (FoundryUser.isGm) {
      return true
    }
    if (!FoundryModules.isActive(LOCK_VIEW_KEY)) {
      return true
    }
    return !this.raw.scene.getFlag(LOCK_VIEW_KEY, 'lockZoom')
  }

  isPanAllowed() {
    if (FoundryUser.isGm) {
      return true
    }
    if (!FoundryModules.isActive(LOCK_VIEW_KEY)) {
      return true
    }
    return !this.raw.scene.getFlag(LOCK_VIEW_KEY, 'lockPan')
  }
}

export default new FoundryCanvas()
