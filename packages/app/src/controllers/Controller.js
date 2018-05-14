global.controllers = {}

export default class Controller {
  constructor({resolvers, name}) {
    for (const key of Object.keys(resolvers || {})) {
      this[key] = async (params, viewer) => {
        return await resolvers[key].resolve(params, viewer)
      }
    }
    this.name = name
    this.resolvers = resolvers
    global.controllers[name] = this
  }
}
