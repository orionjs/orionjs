import {Job as AgendaJob} from 'agenda/es'
import {url} from './../test/setup'
import {Agenda} from 'agenda/es'
import {JobManager} from './../JobManager'
import {init, job, TriggerEventTypeJob} from '..'

describe('initJobs', () => {
  let specs = {}
  const nextRun = new Date(Date.now() + 1000 * 60 * 60 * 24)

  describe('default configuration', () => {
    beforeEach(async () => {
      specs = {
        recurrentJob: job({
          type: 'recurrent',
          name: 'recurrentJob',
          getNextRun: () => nextRun,
          run: () => {
            // Do nothing
          }
        }),

        eventJob: job({
          type: 'event',
          name: 'eventJob',
          getNextRun: () => nextRun,
          run: () => {
            // Do nothing
          }
        })
      }

      await init(specs, {
        dbAddress: url
      })
    })

    afterEach(async () => {
      await JobManager.stop()
      await JobManager.getAgenda().close({force: true})
      JobManager.clear()
    })

    it('adds recurrent jobs to agenda', async () => {
      const agenda: Agenda = JobManager.getAgenda()

      const jobs: AgendaJob[] = await agenda.jobs({name: 'recurrentJob'})
      expect(jobs.length).toBe(1)
      expect(jobs[0].attrs._id).toBeDefined()
      expect(jobs[0].attrs.nextRunAt).toEqual(nextRun)
    })

    it('does not add event jobs to agenda before triggering them', async () => {
      const agenda: Agenda = JobManager.getAgenda()

      const jobs = await agenda.jobs({name: 'eventJob'})
      expect(jobs.length).toBe(0)
    })

    it('adds event jobs to agenda after triggering them', async () => {
      const agenda: Agenda = JobManager.getAgenda()

      const eventData = {
        example: true
      }

      await (specs as {eventJob: TriggerEventTypeJob}).eventJob(eventData)
      const jobs = await agenda.jobs({name: 'eventJob'})
      expect(jobs.length).toBe(1)
      expect(jobs[0].attrs._id).toBeDefined()
      expect(jobs[0].attrs.nextRunAt).toEqual(nextRun)
      expect(jobs[0].attrs.data).toEqual(eventData)
    })
  })

  describe('when not using the job() helper', () => {
    beforeEach(async () => {
      specs = {
        recurrentJob: {
          type: 'recurrent',
          name: 'recurrentJob',
          getNextRun: () => nextRun,
          run: () => {
            // Do nothing
          }
        },

        eventJob: {
          type: 'event',
          name: 'eventJob',
          getNextRun: () => nextRun,
          run: () => {
            // Do nothing
          }
        }
      }

      await init(specs, {
        dbAddress: url
      })
    })

    afterEach(async () => {
      await JobManager.stop()
      await JobManager.getAgenda().close({force: true})
      JobManager.clear()
    })

    it('allows scheduling', async () => {
      const agenda: Agenda = JobManager.getAgenda()

      const jobs: AgendaJob[] = await agenda.jobs({name: 'recurrentJob'})
      expect(jobs.length).toBe(1)
      expect(jobs[0].attrs._id).toBeDefined()
      expect(jobs[0].attrs.nextRunAt).toEqual(nextRun)
    })

    it('does not add event jobs to agenda', async () => {
      const agenda: Agenda = JobManager.getAgenda()

      const jobs = await agenda.jobs({name: 'eventJob'})
      expect(jobs.length).toBe(0)
    })
  })
})
