import {Jobs, RecurrentJob} from '@orion-js/dogs'
import {logger} from '@orion-js/logger'
import {Inject} from '@orion-js/services'
import {ExampleService} from 'app/exampleComponent/services/ExampleService'
import {type ExampleService as ExampleServiceType} from 'app/exampleComponent/services/ExampleService'

@Jobs()
export default class ExampleJobs {
  @Inject(() => ExampleService)
  private exampleService: ExampleServiceType

  @RecurrentJob({
    runEvery: 1000 * 10,
  })
  async createExamples() {
    logger.info('Creating example...')
    await this.exampleService.makeExample()
  }
}
