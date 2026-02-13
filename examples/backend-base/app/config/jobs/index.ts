import {JobsDefinition, startWorkers} from '@orion-js/dogs'
import {logger} from '@orion-js/logger'
import {isEmpty} from 'lodash-es'

export default function startJobs(jobs: JobsDefinition) {
  if (isEmpty(jobs)) return
  startWorkers({
    defaultLockTime: 60 * 1000,
    workersCount: 5,
    maxTries: 3,
    jobs,
    onMaxTriesReached: async job => {
      logger.error(`Job ${job.name} reached max tries`)
    },
  })
  logger.info('Jobs started ✅')
}
