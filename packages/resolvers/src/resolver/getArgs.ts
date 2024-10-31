export const getArgs = function getArgs(...args: any[]) {
  if (args.length === 4) {
    return {
      parent: args[0],
      params: args[1] || {},
      viewer: args[2] || {},
      info: args[3] || {},
    }
  }
  if (args.length < 4) {
    return {
      params: args[0] || {},
      viewer: args[1] || {},
      info: args[2] || {},
    }
  }
  throw new Error('A resolver must be called with 2 parameters only')
}
