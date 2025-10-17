import {test, expect} from 'vitest'
import {createResolver} from '..'
import {getOrionAsyncContext, OrionAsyncContext} from '@orion-js/logger'

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
