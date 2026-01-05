import {describe, it, expect, vi} from 'vitest'
import {Executor} from './Executor'
import {getOrionAsyncContext} from '@orion-js/logger'

describe('Executor async context', () => {
  it('sets job context when executing', async () => {
    const executor = new Executor() as any
    executor.jobsRepo = {
      extendLockTime: vi.fn(),
      scheduleNextRun: vi.fn(),
      deleteEventJob: vi.fn(),
      setJobRecordPriority: vi.fn(),
      markJobAsMaxTriesReached: vi.fn(),
    }
    executor.jobsHistoryRepo = {
      saveExecution: vi.fn(),
    }

    const jobDefinition = {
      type: 'event' as const,
      saveExecutionsFor: 0,
      resolve: vi.fn(async () => {
        const context = getOrionAsyncContext()
        expect(context?.contextId).toBeDefined()
        expect(typeof context?.contextId).toBe('string')
        expect(context?.controllerType).toBe('job')
        expect(context?.jobName).toBe('testJob')
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
        name: 'testJob',
        type: 'event',
        priority: 1,
        tries: 0,
        lockTime: 1000,
        params: {},
        uniqueIdentifier: 'unique123',
      },
      vi.fn(),
    )

    expect(jobDefinition.resolve).toHaveBeenCalled()
  })
})
