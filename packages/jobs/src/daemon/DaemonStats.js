import {config} from '@orion-js/app'
import JobsRepository from './JobsRepository'

export default class DaemonStats {
  constructor(jobs) {
    this.logger = config().logger
    this.step = 1
    this.factor = 8
    this.count = 0
    this.goingUp = false
    JobsRepository.setJobs(jobs)
  }

  start() {
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
    try {
      const {pending, running, delayed} = await JobsRepository.getStats()
      const {lowerBound, upperBound} = this.bounds()
      const stats = {pending, running, delayed, step: this.step}
      if (this.step > 1 && pending < lowerBound) {
        this.logger.info(`pending jobs count has gone below ${lowerBound}`, stats)
        this.step = this.getStepFromCount(this.count, true)
        this.goingUp = false
      } else if (pending >= upperBound) {
        const newStep = this.getStepFromCount(pending)
        const danger = newStep - this.step > 1 || this.goingUp
        this.logger[danger ? 'error' : 'warn'](
          `pending jobs count has gone above ${upperBound}`,
          stats
        )
        this.step = newStep
        this.goingUp = true
      }
    } catch (error) {
      this.logger.error('Error running job stats:', error)
    }
  }
}
