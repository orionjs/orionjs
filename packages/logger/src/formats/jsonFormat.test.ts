import {describe, it, expect, beforeEach} from 'vitest'
import {runWithOrionAsyncContext} from '../asyncContext'
import {jsonConsoleFormat} from './consoleFormats'
import winston from 'winston'
import {Writable} from 'node:stream'

describe('JSON console format with async context', () => {
  let logs: any[] = []
  let testLogger: winston.Logger

  beforeEach(() => {
    logs = []
    const stream = new Writable({
      write: (chunk, _encoding, callback) => {
        try {
          const parsed = JSON.parse(chunk.toString())
          console.log(parsed)
          logs.push(parsed)
        } catch {
          // ignore parse errors
        }
        callback()
      },
    })

    testLogger = winston.createLogger({
      level: 'debug',
      format: jsonConsoleFormat,
      transports: [
        new winston.transports.Stream({
          stream,
        }),
      ],
    })
  })

  it('includes job context in JSON logs', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'job',
        jobName: 'sendEmail',
        params: {to: 'user@example.com'},
      },
      async () => {
        testLogger.info('Processing email job')
      },
    )

    expect(logs).toHaveLength(1)
    const log = logs[0]
    expect(log.message).toBe('Processing email job')
    expect(log.asyncContext).toBeDefined()
    expect(log.asyncContext.controllerType).toBe('job')
    expect(log.asyncContext.jobName).toBe('sendEmail')
    expect(log.asyncContext.contextId).toBeDefined()
    expect(typeof log.asyncContext.contextId).toBe('string')
  })

  it('includes route context with pathname in JSON logs', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'route',
        routeName: '/api/users/:id',
        pathname: '/api/users/123',
        viewer: {userId: 'user-456'},
      },
      async () => {
        testLogger.info('Handling route request')
      },
    )

    expect(logs).toHaveLength(1)
    const log = logs[0]
    expect(log.message).toBe('Handling route request')
    expect(log.asyncContext).toBeDefined()
    expect(log.asyncContext.controllerType).toBe('route')
    expect(log.asyncContext.routeName).toBe('/api/users/:id')
    expect(log.asyncContext.pathname).toBe('/api/users/123')
    expect(log.asyncContext.userId).toBe('user-456')
    expect(log.asyncContext.contextId).toBeDefined()
  })

  it('includes resolver context in JSON logs', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'resolver',
        resolverName: 'getUser',
        viewer: {id: 'viewer-789'},
      },
      async () => {
        testLogger.info('Executing resolver')
      },
    )

    expect(logs).toHaveLength(1)
    const log = logs[0]
    expect(log.message).toBe('Executing resolver')
    expect(log.asyncContext).toBeDefined()
    expect(log.asyncContext.controllerType).toBe('resolver')
    expect(log.asyncContext.resolverName).toBe('getUser')
    expect(log.asyncContext.userId).toBe('viewer-789')
    expect(log.asyncContext.contextId).toBeDefined()
  })

  it('includes echo context in JSON logs', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'echo',
        echoName: 'userCreated',
        params: {userId: '123'},
      },
      async () => {
        testLogger.info('Processing echo event')
      },
    )

    expect(logs).toHaveLength(1)
    const log = logs[0]
    expect(log.message).toBe('Processing echo event')
    expect(log.asyncContext).toBeDefined()
    expect(log.asyncContext.controllerType).toBe('echo')
    expect(log.asyncContext.echoName).toBe('userCreated')
    expect(log.asyncContext.contextId).toBeDefined()
  })

  it('extracts userId from viewer._id', async () => {
    await runWithOrionAsyncContext(
      {
        controllerType: 'route',
        routeName: '/api/test',
        pathname: '/api/test',
        viewer: {_id: 'mongo-id-123'},
      },
      async () => {
        testLogger.info('Test log')
      },
    )

    expect(logs).toHaveLength(1)
    expect(logs[0].asyncContext.userId).toBe('mongo-id-123')
  })

  it('does not include asyncContext when outside async context', () => {
    testLogger.info('No async context')

    expect(logs).toHaveLength(1)
    expect(logs[0].asyncContext).toBeUndefined()
  })

  it('outputs level and message as first keys in order', () => {
    testLogger.info('Test message')

    expect(logs).toHaveLength(1)
    const actualKeys = Object.keys(logs[0])
    expect(actualKeys[0]).toBe('level')
    expect(actualKeys[1]).toBe('message')
  })
})
