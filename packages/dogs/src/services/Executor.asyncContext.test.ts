import {describe, expect, it, mock} from 'bun:test'
import {getOrionAsyncContext} from '@orion-js/logger'
import {Executor} from './Executor'

describe('Executor async context', () => {
  it('sets job context when executing', async () => {
    const executor = new Executor() as any
    executor.jobsRepo = {
      extendLockTime: mock(),
      scheduleNextRun: mock(),
      deleteEventJob: mock(),
      setJobRecordPriority: mock(),
      markJobAsMaxTriesReached: mock(),
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
      mock(),
    )

    expect(jobDefinition.resolve).toHaveBeenCalled()
  })
})
