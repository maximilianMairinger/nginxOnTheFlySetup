function sanitize(pattern) {
  let against
  if (pattern instanceof Function) against = pattern
  else if (typeof pattern === "string") against = (input) => {
    if (input === undefined || input === null) return pattern
    else if (typeof input === 'string') return input
    else throw new Error('Input is not a string')
  }
  else if (pattern === String) against = (input) => {
    if (typeof input === "string") return input
    else throw new Error('Input is not a string')
  }
  else if (typeof pattern === "number") against = (input) => {
    if (input === undefined || input === null) return pattern
    else if (typeof input === 'number') return input
    else throw new Error('Input is not a number')
  }
  else if (pattern === Number) against = (input) => {
    if (typeof input === "number") return input
    else throw new Error('Input is not a number')
  }
  else if (typeof pattern === "boolean") against = (input) => {
    if (input === undefined || input === null) return pattern
    else if (typeof input === 'boolean') return input
    else throw new Error('Input is not a boolean')
  }
  else if (pattern === Boolean) against = (input) => {
    if (typeof input === "boolean") return input
    else throw new Error('Input is not a boolean')
  }
  else if (pattern instanceof Array) {
    const myPattern = pattern.map(sanitize)
    against = (input) => {
      let curRet
      for (const myPat of myPattern) {
        curRet = myPat(input)
      }
      return curRet
    }
  }
  else if (typeof pattern === "object" && pattern !== null) {
    const myPattern = new Map()
    for (const key in pattern) {
      myPattern.set(key, sanitize(pattern[key]))
    }

    against = (input) => {
      if (typeof input !== "object" || input === null) throw new Error('Input is not an object')
      const out = Object.create(null)
      for (const [val, key] of myPattern) {
        out[key] = val(input[key])
      }
      return out
    }  
  }

  return against
}

exports.sanitize = sanitize
