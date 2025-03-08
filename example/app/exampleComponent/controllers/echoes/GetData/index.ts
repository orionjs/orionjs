import { EchoRequest, Echoes } from '@orion-js/echoes'
import { Inject } from '@orion-js/services'
import { ExampleRepository } from 'app/exampleComponent/repos/Example'
import { ExampleSchema } from 'app/exampleComponent/schemas/ExampleSchema'

@Echoes()
export class GetDataEchoes {
  @Inject()
  private exampleRepository: ExampleRepository

  @EchoRequest()
  async getDataById(params: { exampleId: string }): Promise<ExampleSchema> {
    return await this.exampleRepository.getExampleById(params.exampleId)
  }
}
