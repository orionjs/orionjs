import {JobDefinition} from '../types/JobsDefinition'

export const defineJob = (options: JobDefinition): JobDefinition => {
  if (options.type === 'recurrent') {
    if (!options.hasOwnProperty('priority')) {
      options.priority = 100
    }
  }

  return options
}
