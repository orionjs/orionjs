import {Route, Routes} from '@orion-js/http'
import {mergeComponentControllers} from '.'
import {component} from '../components'

describe('Merge components', () => {
  it('should return merged components', () => {
    @Routes()
    class TestRoutes1 {
      @Route({path: '/test', method: 'get'})
      async test() {}
      @Route({path: '/test', method: 'get'})
      async test2() {}
    }

    @Routes()
    class TestRoutes2 {
      @Route({path: '/test', method: 'get'})
      async test3() {}
      @Route({path: '/test', method: 'get'})
      async test4() {}
    }
    const component1 = component({
      routes: [TestRoutes1, TestRoutes2]
    })

    const mergedComponent = mergeComponentControllers(component1)

    const aRoute = {
      path: '/test',
      method: 'get',
      resolve: expect.any(Function)
    }
    expect(mergedComponent).toEqual({
      echoes: {},
      jobs: {},
      modelResolvers: {},
      resolvers: {},
      subscriptions: {},
      routes: {
        test: aRoute,
        test2: aRoute,
        test3: aRoute,
        test4: aRoute
      }
    })
  })
})
