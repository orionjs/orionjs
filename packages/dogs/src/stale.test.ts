import {generateId, sleep} from '@orion-js/helpers'
import {logger, setLogLevel} from '@orion-js/logger'
import {defineJob, jobsHistoryRepo, scheduleJob, startWorkers} from '.'

setLogLevel('none')

describe('Stale Jobs Management', () => {
  it('Should spawn a new worker when a job is stale and kill the stale worker after it ends', async () => {
    const jobName1 = 'job1' + generateId()
    const job1 = defineJob({
      type: 'event',
      async resolve(_, context) {
        if (context.tries === 1) {
          await sleep(30)
        }
        return {status: 'finished'}
      }
    })

    const jobName2 = 'job2' + generateId()
    const job2 = defineJob({
      type: 'event',
      async resolve() {
        return {status: 'finished'}
      }
    })

    const instance = startWorkers({
      jobs: {[jobName1]: job1, [jobName2]: job2},
      workersCount: 1,
      pollInterval: 5,
      cooldownPeriod: 5,
      lockTime: 10
    })

    await scheduleJob({name: jobName1})
    await scheduleJob({name: jobName2})

    await sleep(150)
    await instance.stop()

    const executions1 = await jobsHistoryRepo.getExecutions(jobName1)
    expect(executions1.length).toBe(2)

    const executions2 = await jobsHistoryRepo.getExecutions(jobName2)
    expect(executions2.length).toBe(1)

    expect(instance.workers.length).toBe(2)
  })
})
