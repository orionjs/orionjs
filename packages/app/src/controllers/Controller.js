global.controllers = {}

export default class Controller {
  constructor({resolvers, name}) {
    this.name = name
    this.resolvers = resolvers
    global.controllers[name] = this
  }
}
