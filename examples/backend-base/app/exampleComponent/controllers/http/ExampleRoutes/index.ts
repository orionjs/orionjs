import {Route, Routes} from '@orion-js/http'
import {Inject} from '@orion-js/services'
import {createRoute} from '@orion-js/http'
import {ExampleId} from 'app/exampleComponent/schemas/ExampleSchema'
import {ExampleService} from 'app/exampleComponent/services/ExampleService'

@Routes()
export default class ExampleRoutes {
  @Inject(() => ExampleService)
  private exampleService: ExampleService

  @Route()
  example = createRoute({
    path: '/example/:exampleId',
    method: 'get',
    resolve: async req => {
      const {exampleId} = req.params
      return {
        body: await this.exampleService.getAExample(exampleId as ExampleId),
      }
    },
  })
}
