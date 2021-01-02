import {libWrapper} from './libWrapper.js'
import packageJson from '../../package.json'
const MODULE_NAME = packageJson.name

export function wrapMethod(method, wrapper, mode = 'WRAPPER') {
  return libWrapper.register(MODULE_NAME, method, wrapper, mode)
}

export function injectMethodCondition(method, predicate) {
  return libWrapper.register(MODULE_NAME, method, (next, ...args) => {
    if (predicate(...args)) {
      return next(...args)
    }
  }, 'MIXED')
}
