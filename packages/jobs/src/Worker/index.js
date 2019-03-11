import {setOnExit} from '@orion-js/app'

export default class Worker {
  constructor({index}) {
    this.index = index
    setOnExit(this.onExit)
  }

  onExit = async () => {
    if (this.currentExecution) {
      await this.currentExecution
    }
  }

  itsFree() {
    return !this.currentExecution
  }

  async execute(func) {
    this.currentExecution = func()
    await this.currentExecution
    this.currentExecution = null
  }
}
