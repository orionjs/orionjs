import {Jobs, createRecurrentJob, RecurrentJob, createEventJob, EventJob} from '@orion-js/dogs'
import {logger} from '@orion-js/logger'
import {Inject} from '@orion-js/services'
import {ExampleService} from 'app/exampleComponent/services/ExampleService'

@Jobs()
export default class ExampleJobs {
  @Inject(() => ExampleService)
  private exampleService: ExampleService

  @RecurrentJob()
  createExamples = createRecurrentJob({
    runEvery: '1m',
    resolve: async () => {
      logger.info('Creating example...')
      await this.exampleService.makeExample()
    },
  })

  @EventJob()
  processExample = createEventJob({
    params: {
      exampleId: {type: String},
    },
    resolve: async params => {
      logger.info('Processing example...', {
        exampleId: params.exampleId,
      })
    },
  })
}
