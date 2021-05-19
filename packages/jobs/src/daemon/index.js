import range from 'lodash/range'
import Worker from '../Worker'
import JobRepository from './JobsRepository'
import sleep from '../helpers/sleep'
import loop from './loop'
import {config} from '@orion-js/app'
import DaemonStats from './DaemonStats'

class Daemon {
  constructor() {
    this.running = false
  }

  init({jobs, workersCount, statsOn}) {
    this.jobs = jobs
    const {logger} = config()
    JobRepository.setJobs(jobs)
    JobRepository.deleteUnclaimedJobs()
      .then(result => {
        if (result.deletedCount > 0) logger.info(`${result.deletedCount} unclaimed jobs deleted`)
      })
      .catch(error => logger.warn('error deleting unclaimed jobs', error))

    if (statsOn) {
      this.stats = new DaemonStats()
      this.stats.start()
    }

    const workers = range(workersCount).map(index => new Worker({index}))
    this.workers = workers
    global.jobWorkers = workers
    this.run()
  }

  async run() {
    this.running = true
    while (this.running) {
      this.currentLoop = loop(this)
      const delay = await this.currentLoop
      if (delay) {
        await sleep(delay)
      }
    }
  }

  async stop() {
    const {logger} = config()
    logger.info('Stopping jobs...')
    this.running = false
    await Promise.all([
      this.currentLoop,
      this.stats && this.stats.stop(),
      ...this.workers.map(worker => worker.close())
    ])
    logger.info('Jobs stopped')
  }
}

export default new Daemon()
