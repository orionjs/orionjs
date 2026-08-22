import {describe, expect, it, mock} from 'bun:test'
import {getOrionAsyncContext} from '@orion-js/logger'
import type {ExecutionContext} from '../types/Worker'
import {Executor} from './Executor'

describe('Executor async context', () => {
  it('sets job context when executing', async () => {
    const executor = new Executor() as any
    executor.jobsRepo = {
      extendLockTime: mock(async () => true),
      scheduleNextRun: mock(async () => true),
      deleteEventJob: mock(async () => true),
      setJobRecordPriority: mock(async () => true),
      markJobAsMaxTriesReached: mock(async () => true),
    }
    executor.jobsHistoryRepo = {
      saveExecution: mock(),
    }

    const jobDefinition = {
      type: 'event' as const,
      saveExecutionsFor: 0,
      resolve: mock(async () => {
        const context = getOrionAsyncContext()
        expect(context?.contextId).toBeDefined()
        expect(typeof context?.contextId).toBe('string')
        expect(context?.controllerType).toBe('job')
        expect(context?.jobName).toBe('testJob')
        expect(context?.jobId).toBe('id123')
        expect(context?.params).toEqual({})
      }),
    }

    await executor.executeJob(
      {
        jobs: {testJob: jobDefinition},
        maxTries: 10,
        onMaxTriesReached: async () => {},
      },
      {
        jobId: 'id123',
        executionId: 'exec123',
        lockId: 'exec123',
        name: 'testJob',
        type: 'event',
        priority: 1,
        tries: 0,
        lockTime: 1000,
        params: {},
        uniqueIdentifier: 'unique123',
      },
      mock(),
    )

    expect(jobDefinition.resolve).toHaveBeenCalled()
  })

  it('does not extend the lock after an execution becomes stale', async () => {
    const executor = new Executor() as any
    const extendLockTime = mock(async () => true)
    const deleteEventJob = mock(async () => true)
    executor.jobsRepo = {
      extendLockTime,
      deleteEventJob,
      setJobRecordPriority: mock(async () => true),
      markJobAsMaxTriesReached: mock(async () => true),
    }
    executor.jobsHistoryRepo = {
      saveExecution: mock(async () => {}),
    }

    let notifyStale!: () => void
    const stale = new Promise<void>(resolve => {
      notifyStale = resolve
    })
    const onExecutionStale = mock(() => notifyStale())

    const jobDefinition = {
      type: 'event' as const,
      saveExecutionsFor: 0,
      resolve: mock(async (_params: unknown, context: ExecutionContext) => {
        await stale
        await context.extendLockTime(1000)
      }),
    }

    await executor.executeJob(
      {
        jobs: {testJob: jobDefinition},
        maxTries: 10,
      },
      {
        jobId: 'id-stale',
        executionId: 'exec-stale',
        lockId: 'exec-stale',
        name: 'testJob',
        type: 'event',
        priority: 1,
        tries: 1,
        lockTime: 0,
        params: {},
      },
      onExecutionStale,
    )

    expect(onExecutionStale).toHaveBeenCalledTimes(1)
    expect(extendLockTime).not.toHaveBeenCalled()
    expect(deleteEventJob).not.toHaveBeenCalled()
  })
})
