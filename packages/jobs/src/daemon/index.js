import range from 'lodash/range'
import Worker from '../Worker'
import JobRepository from './JobsRepository'
import sleep from '../helpers/sleep'
import loop from './loop'
import {config} from '@orion-js/app'

class Daemon {
  constructor() {
    this.running = false
    this.workers = []
  }

  init({jobs, workersCount}) {
    if (this.running) return
    this.running = true
    this.jobs = jobs
    const {logger} = config()
    JobRepository.setJobs(jobs)
    JobRepository.deleteUnclaimedJobs()
      .then(result => {
        if (result.deletedCount > 0) logger.info(`${result.deletedCount} unclaimed jobs deleted`)
      })
      .catch(error => logger.warn('error deleting unclaimed jobs', error))

    this.workers = range(workersCount).map(index => new Worker({index}))
    global.jobWorkers = this.workers
    logger.info(`Starting jobs with ${workersCount} workers`)
    this.run()
  }

  async run() {
    while (this.running) {
      this.currentLoop = loop(this)
      const delay = await this.currentLoop
      if (delay) {
        await sleep(delay)
      }
    }
  }

  async stop() {
    if (!this.running) return
    this.running = false
    const {logger} = config()
    logger.info('Stopping jobs...')
    await Promise.all([this.currentLoop, ...this.workers.map(worker => worker.close())])
    logger.info('Jobs stopped')
  }
}

export default new Daemon()
