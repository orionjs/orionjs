import {Query} from '@orion-js/graphql'
import {Routes} from '@orion-js/http'
import {Route} from '@orion-js/http'
import {describe, expect, it} from 'vitest'
import {Resolvers} from '@orion-js/graphql'
import {component} from '.'

describe('Components', () => {
  it('should force the correct type of component', () => {
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

    const comp = component({
      routes: [TestRoutes1, TestRoutes2],
      resolvers: [TestResolvers],
    })

    expect(comp.controllers.routes).toEqual([TestRoutes1, TestRoutes2])
  })
})
