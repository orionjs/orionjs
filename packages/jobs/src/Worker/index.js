export default class Worker {
  constructor({index}) {
    this.index = index
  }

  itsFree() {
    return !this.running
  }

  async execute(func) {
    this.running = true
    await func()
    this.running = false
  }
}
