import {JobsDefinition, startWorkers} from '@orion-js/dogs'
import {isEmpty} from 'lodash'

export default function startJobs(jobs: JobsDefinition) {
  if (isEmpty(jobs)) return
  startWorkers({
    lockTime: 60 * 1000,
    workersCount: 5,
    jobs,
  })
}
