import {Jobs, RecurrentJob} from '@orion-js/dogs'
import {logger} from '@orion-js/logger'
import {Inject} from '@orion-js/services'
import {ExampleService} from 'app/exampleComponent/services/ExampleService'

@Jobs()
export default class ExampleJobs {
  @Inject()
  private exampleService: ExampleService

  @RecurrentJob({
    runEvery: 1000 * 60,
  })
  async createExamples() {
    logger.info('Creating example...')
    await this.exampleService.makeExample()
  }
}
