import {test, expect} from 'vitest'
import {createResolver} from '..'
import {getOrionAsyncContext, OrionAsyncContext, runWithOrionAsyncContext} from '@orion-js/logger'

test('resolver async context exposes viewer data', async () => {
  let capturedContext: OrionAsyncContext | undefined = undefined

  const resolver = createResolver({
    async resolve(_params, viewer: {id: string}) {
      capturedContext = getOrionAsyncContext()
      return viewer.id
    },
  })

  const viewer = {id: 'viewer-1'}
  const result = await resolver.execute({viewer})

  expect(result).toBe('viewer-1')
  expect(capturedContext).toBeDefined()
  expect(capturedContext?.contextId).toBeDefined()
  expect(typeof capturedContext?.contextId).toBe('string')
  expect(capturedContext?.controllerType).toBe('resolver')
  expect(capturedContext?.viewer).toEqual(viewer)
  if (capturedContext?.controllerType === 'resolver') {
    expect(capturedContext.resolverName).toBeDefined()
  }
})

test('resolver context should override route context properties', async () => {
  let capturedContext: OrionAsyncContext | undefined = undefined

  const resolver = createResolver({
    resolverId: 'testResolver',
    async resolve(_params, viewer: {id: string}) {
      capturedContext = getOrionAsyncContext()
      return viewer.id
    },
  })

  const viewer = {id: 'viewer-from-resolver'}

  // Simulate a route context (like when GraphQL is called from an HTTP route)
  await runWithOrionAsyncContext(
    {
      controllerType: 'route',
      routeName: '/graphql',
      pathname: '/graphql',
      viewer: {id: 'viewer-from-route'},
      params: {query: 'test'},
    },
    async () => {
      const result = await resolver.execute({viewer})

      expect(result).toBe('viewer-from-resolver')
      expect(capturedContext).toBeDefined()
      expect(capturedContext?.controllerType).toBe('resolver')
      expect(capturedContext?.viewer).toEqual(viewer)

      // Route-specific properties should NOT be present in resolver context
      if (capturedContext?.controllerType === 'resolver') {
        expect(capturedContext.resolverName).toBe('testResolver')
        expect((capturedContext as any).routeName).toBeUndefined()
        expect((capturedContext as any).pathname).toBeUndefined()
      }
    },
  )
})
