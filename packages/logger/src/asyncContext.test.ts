import {describe, it, expect} from 'vitest'
import {runWithOrionAsyncContext, getOrionAsyncContext} from './asyncContext'

describe('OrionAsyncContext', () => {
  it('generates unique contextId for each context', async () => {
    const contextIds: string[] = []

    await runWithOrionAsyncContext({controllerType: 'job', jobName: 'job1'}, async () => {
      const ctx = getOrionAsyncContext()
      contextIds.push(ctx.contextId)
    })

    await runWithOrionAsyncContext({controllerType: 'job', jobName: 'job2'}, async () => {
      const ctx = getOrionAsyncContext()
      contextIds.push(ctx.contextId)
    })

    await runWithOrionAsyncContext({controllerType: 'route', routeName: '/test'}, async () => {
      const ctx = getOrionAsyncContext()
      contextIds.push(ctx.contextId)
    })

    expect(contextIds).toHaveLength(3)
    expect(contextIds[0]).not.toBe(contextIds[1])
    expect(contextIds[1]).not.toBe(contextIds[2])
    expect(contextIds[0]).not.toBe(contextIds[2])
  })

  it('contextId is a valid UUID format', async () => {
    await runWithOrionAsyncContext({controllerType: 'resolver'}, async () => {
      const ctx = getOrionAsyncContext()
      expect(ctx?.contextId).toBeDefined()
      expect(typeof ctx?.contextId).toBe('string')
      // UUID v4 format check
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(ctx?.contextId).toMatch(uuidRegex)
    })
  })
})
