import {JobsDefinition} from './JobsDefinition'

export interface StartWorkersConfig {
  jobs: JobsDefinition
  workerCount?: number
}
