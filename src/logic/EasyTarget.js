import {wrapMethod} from '../utils/Injection'

export function initEasyTarget() {
  wrapMethod('MouseInteractionManager.prototype._handleClickLeft', function (originalMethod, event, ...args) {
    const token = event.currentTarget
    if (token instanceof Token && typeof this.can === 'function' && !this.can('clickLeft', event)) {
      // The user usually cannot click this token => we'll select it
      token.setTarget(!token.isTargeted, { releaseOthers: true })
    } else {
      return originalMethod.call(this, event, ...args)
    }
  }, 'MIXED')
}
