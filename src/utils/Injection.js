export function replaceMethod(object, methodName, replacement) {
  const originalMethod = object[methodName]
  if (typeof originalMethod !== 'function') {
    throw new Error(`Method ${methodName} on object ${object} doesn't exist.`)
  }

  object[methodName] = function injectedMethod(...args) {
    return replacement({
      self: this,
      original: originalMethod.bind(this),
      callOriginal: () => originalMethod.call(this, ...args),
    }, ...args)
  }
}

export function injectMethodCondition(object, methodName, predicate) {
  replaceMethod(object, methodName, ({ callOriginal }, ...args) => {
    if (predicate(...args)) {
      callOriginal()
    }
  })
}
