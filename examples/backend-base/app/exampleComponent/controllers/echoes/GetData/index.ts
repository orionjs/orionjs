import {EchoRequest, Echoes} from '@orion-js/echoes'
import {Inject} from '@orion-js/services'
import {createEchoRequest} from '@orion-js/echoes'
import {schemaWithName} from '@orion-js/schema'
import {ExampleRepository} from 'app/exampleComponent/repos/Example'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'
import {typedId} from '@orion-js/mongodb'

const GetDataByIdParams = schemaWithName('GetDataByIdParams', {
  exampleId: {type: typedId('ex')},
})

@Echoes()
export class GetDataEchoes {
  @Inject(() => ExampleRepository)
  private exampleRepository: ExampleRepository

  @EchoRequest()
  getDataById = createEchoRequest({
    params: GetDataByIdParams,
    returns: ExampleSchema,
    resolve: async params => {
      return await this.exampleRepository.getExampleById(params.exampleId)
    },
  })
}
