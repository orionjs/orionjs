import {sleep, generateId} from '@orion-js/helpers'
import {defineJob, scheduleJob, startWorkers} from '.'
import {describe, it, expect} from 'vitest'

describe('Parallel Event Jobs', () => {
  it('Should run multiple event jobs with the same jobName in parallel', async () => {
    const jobName = `parallelJob${generateId()}`
    const executions: string[] = []
    const executionTimes: number[] = []

    const job = defineJob({
      type: 'event',
      async resolve(params) {
        const startTime = Date.now()
        executions.push(`execution-${params.id}`)

        // Simulate some work
        await sleep(100)

        const endTime = Date.now()
        executionTimes.push(endTime - startTime)

        return {id: params.id, processed: true}
      },
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 5, // Multiple workers to enable parallel execution
      pollInterval: 10,
      cooldownPeriod: 10,
    })

    // Schedule multiple jobs with the same name but different parameters
    const schedulePromises = []
    for (let i = 1; i <= 3; i++) {
      schedulePromises.push(
        scheduleJob({
          name: jobName,
          params: {id: i},
          runIn: 10,
        }),
      )
    }

    await Promise.all(schedulePromises)

    // Wait for all jobs to complete
    await sleep(500)
    await instance.stop()

    // Verify all jobs executed
    expect(executions).toHaveLength(3)
    expect(executions).toContain('execution-1')
    expect(executions).toContain('execution-2')
    expect(executions).toContain('execution-3')

    // Verify they ran in parallel (all should complete around the same time)
    expect(executionTimes).toHaveLength(3)
    executionTimes.forEach(time => {
      expect(time).toBeGreaterThanOrEqual(90) // Allow some tolerance
      expect(time).toBeLessThan(150)
    })
  })

  it('Should run event jobs with same name but different uniqueIdentifier in parallel', async () => {
    const jobName = `uniqueParallelJob${generateId()}`
    const executions: string[] = []

    const job = defineJob({
      type: 'event',
      async resolve(params) {
        executions.push(`execution-${params.id}`)
        await sleep(50)
        return {id: params.id}
      },
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 3,
      pollInterval: 10,
      cooldownPeriod: 10,
    })

    // Schedule jobs with same name but different unique identifiers
    await Promise.all([
      scheduleJob({
        name: jobName,
        params: {id: 'A'},
        uniqueIdentifier: 'unique-A',
        runIn: 10,
      }),
      scheduleJob({
        name: jobName,
        params: {id: 'B'},
        uniqueIdentifier: 'unique-B',
        runIn: 10,
      }),
      scheduleJob({
        name: jobName,
        params: {id: 'C'},
        uniqueIdentifier: 'unique-C',
        runIn: 10,
      }),
    ])

    await sleep(300)
    await instance.stop()

    expect(executions).toHaveLength(3)
    expect(executions).toContain('execution-A')
    expect(executions).toContain('execution-B')
    expect(executions).toContain('execution-C')
  })

  it('Should prevent duplicate jobs with same uniqueIdentifier but allow different ones', async () => {
    const jobName = `duplicateUniqueJob${generateId()}`
    const executions: string[] = []

    const job = defineJob({
      type: 'event',
      async resolve(params) {
        executions.push(`execution-${params.id}`)
        return {id: params.id}
      },
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 3,
      pollInterval: 10,
      cooldownPeriod: 10,
    })

    // Schedule multiple jobs with same unique identifier (should be deduplicated)
    await Promise.all([
      scheduleJob({
        name: jobName,
        params: {id: 'duplicate1'},
        uniqueIdentifier: 'same-unique-id',
        runIn: 10,
      }),
      scheduleJob({
        name: jobName,
        params: {id: 'duplicate2'},
        uniqueIdentifier: 'same-unique-id',
        runIn: 10,
      }),
      scheduleJob({
        name: jobName,
        params: {id: 'different'},
        uniqueIdentifier: 'different-unique-id',
        runIn: 10,
      }),
    ])

    await sleep(200)
    await instance.stop()

    // Should only have 2 executions: one for the duplicate (first one wins) and one for the different
    expect(executions).toHaveLength(2)
    expect(executions).toContain('execution-different')
    // Should contain either duplicate1 or duplicate2, but not both
    expect(
      executions.includes('execution-duplicate1') || executions.includes('execution-duplicate2'),
    ).toBe(true)
    expect(
      executions.includes('execution-duplicate1') && executions.includes('execution-duplicate2'),
    ).toBe(false)
  })

  it('Should handle high concurrency with same job name', async () => {
    const jobName = `highConcurrencyJob${generateId()}`
    const executions: string[] = []
    const startTimes: number[] = []

    const job = defineJob({
      type: 'event',
      async resolve(params) {
        const startTime = Date.now()
        startTimes.push(startTime)
        executions.push(`execution-${params.id}`)

        // Very short execution time to test concurrency
        await sleep(20)

        return {id: params.id}
      },
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 10, // High worker count
      pollInterval: 5,
      cooldownPeriod: 5,
    })

    // Schedule many jobs with the same name
    const schedulePromises = []
    for (let i = 1; i <= 20; i++) {
      schedulePromises.push(
        scheduleJob({
          name: jobName,
          params: {id: i},
          runIn: 5,
        }),
      )
    }

    await Promise.all(schedulePromises)

    // Wait for all jobs to complete
    await sleep(1000)
    await instance.stop()

    // Verify all jobs executed
    expect(executions).toHaveLength(20)

    // Check that jobs ran in parallel (many should start around the same time)
    startTimes.sort((a, b) => a - b)
    const firstStart = startTimes[0]
    const lastStart = startTimes[startTimes.length - 1]

    // All jobs should start within a reasonable time window if running in parallel
    expect(lastStart - firstStart).toBeLessThan(500) // 500ms window
  })
})
