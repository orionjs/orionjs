import {Route, Routes} from '@orion-js/http'
import {mergeComponentControllers} from '.'
import {component} from '../components'
import {describe, it, expect} from 'vitest'
import {Query, Resolvers} from '@orion-js/graphql'

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

    @Resolvers()
    class TestResolvers {
      @Query({})
      async theQuery() {}
    }

    const component1 = component({
      routes: [TestRoutes1, TestRoutes2],
      resolvers: [TestResolvers],
    })

    const mergedComponent = mergeComponentControllers(component1)

    const aRoute = {
      path: '/test',
      method: 'get',
      resolve: expect.any(Function),
    }
    expect(mergedComponent).toEqual({
      echoes: {},
      jobs: {},
      modelResolvers: {},
      resolvers: {
        theQuery: expect.anything(),
      },
      subscriptions: {},
      routes: {
        test: aRoute,
        test2: aRoute,
        test3: aRoute,
        test4: aRoute,
      } as any,
    })
  })
})
