import {describe, it, expect} from 'vitest'
import {
  runWithOrionAsyncContext,
  getOrionAsyncContext,
  JobAsyncContext,
  RouteAsyncContext,
  ResolverAsyncContext,
  ModelResolverAsyncContext,
  EchoAsyncContext,
} from './asyncContext'

describe('OrionAsyncContext - Discriminated Unions', () => {
  it('job context only has job-specific fields', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'job',
        jobName: 'processData',
        params: {id: 123},
      },
      async () => {
        const ctx = getOrionAsyncContext()
        expect(ctx?.controllerType).toBe('job')

        // Type narrowing works with discriminated unions
        if (ctx?.controllerType === 'job') {
          expect(ctx.jobName).toBe('processData')
          // TypeScript knows these fields exist on JobAsyncContext
          const jobCtx: JobAsyncContext = ctx
          expect(jobCtx.jobName).toBe('processData')
        }
      },
    )
  })

  it('route context only has route-specific fields', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'route',
        routeName: '/api/users/:id',
        pathname: '/api/users/123',
        viewer: {id: 'user-123'},
        params: {userId: 456},
      },
      async () => {
        const ctx = getOrionAsyncContext()
        expect(ctx?.controllerType).toBe('route')

        if (ctx?.controllerType === 'route') {
          expect(ctx.routeName).toBe('/api/users/:id')
          expect(ctx.pathname).toBe('/api/users/123')
          const routeCtx: RouteAsyncContext = ctx
          expect(routeCtx.routeName).toBe('/api/users/:id')
          expect(routeCtx.pathname).toBe('/api/users/123')
        }
      },
    )
  })

  it('resolver context has resolver-specific fields', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'resolver',
        resolverName: 'getUser',
        viewer: {id: 'viewer-1'},
        params: {name: 'test'},
      },
      async () => {
        const ctx = getOrionAsyncContext()
        expect(ctx?.controllerType).toBe('resolver')

        if (ctx?.controllerType === 'resolver') {
          const resolverCtx: ResolverAsyncContext = ctx
          expect(resolverCtx.resolverName).toBe('getUser')
          expect(resolverCtx.viewer).toEqual({id: 'viewer-1'})
          expect(resolverCtx.params).toEqual({name: 'test'})
        }
      },
    )
  })

  it('modelResolver context has model-specific fields', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'modelResolver',
        modelName: 'User',
        modelResolverName: 'fullName',
        parentData: {firstName: 'John', lastName: 'Doe'},
        params: {format: 'uppercase'},
      },
      async () => {
        const ctx = getOrionAsyncContext()
        expect(ctx?.controllerType).toBe('modelResolver')

        if (ctx?.controllerType === 'modelResolver') {
          expect(ctx.modelName).toBe('User')
          expect(ctx.modelResolverName).toBe('fullName')
          const modelResolverCtx: ModelResolverAsyncContext = ctx
          expect(modelResolverCtx.parentData).toEqual({firstName: 'John', lastName: 'Doe'})
        }
      },
    )
  })

  it('echo context only has echo-specific fields', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'echo',
        echoName: 'userCreated',
        params: {userId: 789},
      },
      async () => {
        const ctx = getOrionAsyncContext()
        expect(ctx?.controllerType).toBe('echo')

        if (ctx?.controllerType === 'echo') {
          expect(ctx.echoName).toBe('userCreated')
          const echoCtx: EchoAsyncContext = ctx
          expect(echoCtx.echoName).toBe('userCreated')
        }
      },
    )
  })

  it('type narrowing prevents access to wrong fields', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'job',
        jobName: 'myJob',
      },
      async () => {
        const ctx = getOrionAsyncContext()

        if (ctx?.controllerType === 'job') {
          // TypeScript knows jobName exists
          expect(ctx.jobName).toBe('myJob')

          // TypeScript would prevent accessing routeName on a job context
          // @ts-expect-error - routeName doesn't exist on JobAsyncContext
          const _routeName = ctx.routeName
        }
      },
    )
  })
})
