import {Job as AgendaJob, Agenda} from 'agenda'
import {url} from './../test/setup'
import {JobManager} from './../JobManager'
import {init, Job, job, stop} from '..'

describe('initJobs', () => {
  let specs = {}
  const nextRun = new Date(Date.now() + 1000 * 60 * 60 * 24)

  describe('default configuration', () => {
    beforeEach(async () => {
      specs = {
        recurrentJob: job({
          type: 'recurrent',
          getNextRun: () => nextRun,
          run: () => {
            // Do nothing
          }
        }),

        singleJob: job({
          type: 'single',
          getNextRun: () => nextRun,
          run: () => {
            // Do nothing
          }
        })
      }

      await init({
        jobs: specs,
        namespace: 'initJobs',
        dbAddress: url
      })
    })

    afterEach(async () => {
      await stop()
      JobManager.clear()
    })

    it('adds recurrent jobs to agenda', async () => {
      const agenda: Agenda = JobManager.getAgenda()

      const jobs: AgendaJob[] = await agenda.jobs({name: 'initJobs.recurrentJob'})
      expect(jobs.length).toBe(1)
      expect(jobs[0].attrs._id).toBeDefined()
      expect(jobs[0].attrs.nextRunAt).toEqual(nextRun)
    })

    it('does not add single jobs to agenda before triggering them', async () => {
      const agenda: Agenda = JobManager.getAgenda()

      const jobs = await agenda.jobs({name: 'initJobs.singleJob'})
      expect(jobs.length).toBe(0)
    })

    it('adds single jobs to agenda after triggering them', async () => {
      const agenda: Agenda = JobManager.getAgenda()

      const data = {
        example: true
      }

      await (specs as {singleJob: Job}).singleJob.schedule(data)
      const jobs = await agenda.jobs({name: 'initJobs.singleJob'})
      expect(jobs.length).toBe(1)
      expect(jobs[0].attrs._id).toBeDefined()
      expect(jobs[0].attrs.nextRunAt).toEqual(nextRun)
      expect(jobs[0].attrs.data).toEqual(data)
    })
  })

  it('calls the run function for a recurrent job', async () => {
    const mock = jest.fn()
    const specs = {
      recurrentJob: job({
        type: 'recurrent',
        name: 'recurrentJob',
        getNextRun: () => new Date(),
        run: mock
      })
    }

    await init({
      jobs: specs,
      namespace: 'initJobs.recurrent',
      dbAddress: url
    })

    await new Promise(r => setTimeout(r, 200))

    expect(mock).toHaveBeenCalled()

    await stop()
    JobManager.clear()
  })
})
