import {createEchoRequest, Echoes, EchoRequest} from '@orion-js/echoes'
import {typedId} from '@orion-js/mongodb'
import {schemaWithName} from '@orion-js/schema'
import {Inject} from '@orion-js/services'
import {ExampleRepository} from 'app/exampleComponent/repos/Example'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'

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
      if (!params) throw new Error('Missing params')
      return await this.exampleRepository.getExampleById(params.exampleId)
    },
  })
}
