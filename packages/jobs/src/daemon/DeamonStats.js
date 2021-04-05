import {config} from '@orion-js/app'
import JobsRepository from './JobsRepository'

export default class DeamonStats {
  constructor() {
    this.logger = config().logger
    this.step = 1
    this.factor = 8
    this.count = 0
    this.goingUp = false
  }

  start() {
    this.logger.info('worker stats started...')
    this.interval = setInterval(() => this.run(), 30 * 1000)
  }

  stop() {
    if (this.interval) clearInterval(this.interval)
    this.interval = null
  }

  bounds() {
    return {
      lowerBound: Math.pow(this.factor, this.step - 1),
      upperBound: Math.pow(this.factor, this.step + 1)
    }
  }

  getStepFromCount(count, goingDown) {
    if (count <= 1) return 1
    const log = Math.log(count) / Math.log(this.factor)
    return goingDown ? Math.ceil(log) : Math.floor(log)
  }

  async run() {
    const count = await JobsRepository.getPendingJobsCount()
    const running = await JobsRepository.getRunningJobsCount()
    const delayed = await JobsRepository.getDelayedJobsCount()
    const {lowerBound, upperBound} = this.bounds()
    const stats = {count, step: this.step, delayed, running}
    if (this.step > 1 && count < lowerBound) {
      this.step = this.getStepFromCount(this.count, true)
      this.logger.info(`pending jobs count has gone below ${lowerBound}`, stats)
      this.goingUp = false
    } else if (count >= upperBound) {
      const newStep = this.getStepFromCount(count)
      const danger = newStep - this.step > 1 || this.goingUp
      this.logger[danger ? 'error' : 'warn'](
        `pending jobs count has gone above ${upperBound}`,
        stats
      )
      this.step = newStep
      this.goingUp = true
    } else {
      this.logger.info(`jobs stats`, stats)
    }
  }
}
