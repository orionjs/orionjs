import {JobManager} from '../JobManager'

export default function getJobName(name: string) {
  return JobManager.namespace === '' ? name : `${JobManager.namespace}.${name}`
}
