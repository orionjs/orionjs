import {Request, Route, RouteResponse, Routes} from '@orion-js/http'
import {Inject} from '@orion-js/services'
import {ExampleService} from 'app/exampleComponent/services/ExampleService'

@Routes()
export default class ExampleRoutes {
  @Inject()
  private exampleService: ExampleService

  @Route({
    path: '/example/:exampleId',
    method: 'get',
  })
  async example(req: Request): RouteResponse {
    const {exampleId} = req.params
    return {
      body: await this.exampleService.getAExample(exampleId),
    }
  }
}
