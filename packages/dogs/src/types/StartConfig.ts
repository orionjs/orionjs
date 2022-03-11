import {JobsDefinition} from './JobsDefinition'

export type LogLevels = 'debug' | 'info' | 'warn' | 'error'

export interface StartWorkersConfig {
  jobs: JobsDefinition
  pollInterval: number
  cooldownPeriod: number
  workersCount: number
  logLevel: LogLevels
}
