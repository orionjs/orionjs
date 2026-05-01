import {sleep} from '@orion-js/helpers'
import {defineJob, startWorkers} from '.'
import {getNextRunDate} from './services/getNextRunDate'

describe('Recurrent tests', () => {
  it('Should run a recurrent job', async () => {
    let ran = false
    const job1 = defineJob({
      type: 'recurrent',
      runEvery: 10,
      async resolve() {
        ran = true
      },
    })

    const instance = startWorkers({
      jobs: {job1},
      workersCount: 3,
      pollInterval: 10,
      cooldownPeriod: 10,
      maxTries: 10,
      onMaxTriesReached: async () => {},
    })

    await sleep(500)
    await instance.stop()

    expect(ran).toBe(true)
  })

  it('Should run a recurrent job 3 times', async () => {
    let count = 0
    const job2 = defineJob({
      type: 'recurrent',
      runEvery: 1,
      async resolve() {
        count++
      },
    })

    const instance = startWorkers({
      jobs: {job2},
      workersCount: 3,
      pollInterval: 1,
      cooldownPeriod: 1,
      maxTries: 10,
      onMaxTriesReached: async () => {},
    })

    await sleep(200)
    await instance.stop()

    expect(count).toBeGreaterThanOrEqual(3)
  })

  it('Should calculate the next run from a cron string and timezone', () => {
    const nextRunAt = getNextRunDate({
      cron: '0 9 * * *',
      timezone: 'America/Santiago',
      currentDate: new Date('2026-05-01T12:00:00.000Z'),
    })

    expect(nextRunAt.toISOString()).toBe('2026-05-01T13:00:00.000Z')
  })

  it('Should define a recurrent job with a cron string and timezone', () => {
    const job = defineJob({
      type: 'recurrent',
      cron: '0 9 * * *',
      timezone: 'America/Santiago',
      async resolve() {},
    })

    expect(job.type).toBe('recurrent')
    expect(job.cron).toBe('0 9 * * *')
    expect(job.timezone).toBe('America/Santiago')
  })

  it('Should require timezone when using a cron string', () => {
    expect(() =>
      defineJob({
        type: 'recurrent',
        cron: '0 9 * * *',
        async resolve() {},
      } as any),
    ).toThrow('Cron recurrent jobs require a timezone')
  })
})
