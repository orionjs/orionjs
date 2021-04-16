import runLoop from './runLoop'
import range from 'lodash/range'
import Worker from '../Worker'
import JobRepository from './JobsRepository'
import {config} from '@orion-js/app'

export default function ({jobs, workersCount}) {
  const {logger} = config()

  JobRepository.setJobs(Object.keys(jobs))
  JobRepository.deleteUnclaimedJobs()
    .then(result => {
      if (result.deletedCount > 0) logger.info(`${result.deletedCount} unclaimed jobs deleted`)
    })
    .catch(error => logger.warn('error deleting unclaimed jobs', error))

  const workers = range(workersCount).map(index => new Worker({index}))
  runLoop({jobs, workers})

  global.jobWorkers = workers
}
