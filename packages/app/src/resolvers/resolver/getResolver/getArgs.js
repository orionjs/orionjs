export default function(...args) {
  if (args.length === 3) {
    return {
      parent: args[0],
      callParams: args[1] || {},
      viewer: args[2] || {}
    }
  } else if (args.length < 3) {
    return {
      callParams: args[0] || {},
      viewer: args[1] || {}
    }
  } else {
    throw new Error('A resolver must be called with 2 parameters only')
  }
}
