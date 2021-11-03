declare const global: any

export const cleanResolvers = function () {
  global.graphQLSubscriptions = {}
  global.graphQLResolvers = {}
}
