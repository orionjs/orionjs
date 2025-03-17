import {expect, describe, it} from 'vitest'
import {EventJob, getServiceJobs, Jobs, RecurrentJob} from '.'
import {createEventJob, createRecurrentJob} from '../defineJob'
import {startWorkers} from '..'
import {sleep} from '@orion-js/helpers'
import {getInstance} from '@orion-js/services'

describe('Jobs (dogs) with service injections', () => {
  it('Should define a jobs map using services', async () => {
    @Jobs()
    class ExampleJobsService {
      @EventJob()
      async job1() {
        return {}
      }

      @RecurrentJob({runEvery: 1000})
      async job2() {
        return {}
      }
    }

    const jobs = getServiceJobs(ExampleJobsService)

    expect(jobs).toMatchObject({
      job1: {
        type: 'event',
        resolve: expect.any(Function),
      },
      job2: {
        type: 'recurrent',
        runEvery: 1000,
        resolve: expect.any(Function),
      },
    })
  })
})

describe('Jobs (dogs) with service injections Orion v4 syntax', () => {
  it('Should define a jobs map using services', async () => {
    let eventJobResult: any
    let didExecute2 = false
    @Jobs()
    class ExampleJobsService {
      @EventJob()
      job1 = createEventJob({
        params: {
          age: {
            type: 'number',
          },
        },
        resolve: async params => {
          eventJobResult = params.age
        },
      })

      @RecurrentJob()
      job2 = createRecurrentJob({
        runEvery: 10,
        resolve: async () => {
          didExecute2 = true
        },
      })
    }

    const jobs = getServiceJobs(ExampleJobsService)

    const instance = startWorkers({
      jobs,
      workersCount: 3,
      pollInterval: 10,
      cooldownPeriod: 10,
    })

    const jobsServiceInstance = getInstance(ExampleJobsService)

    await jobsServiceInstance.job1.schedule({
      params: {
        age: '10' as any, // to test cleaning
      },
    })

    await sleep(200)
    await instance.stop()

    expect(jobs).toMatchObject({
      job1: {
        jobName: 'job1',
        type: 'event',
        resolve: expect.any(Function),
      },
      job2: {
        jobName: 'job2',
        type: 'recurrent',
        runEvery: 10,
        resolve: expect.any(Function),
      },
    })

    expect(eventJobResult).toBe(10)
    expect(didExecute2).toBe(true)
  })
})
