import {url} from '../test/setup'
import {JobManager} from '../JobManager'
import {Job} from '../types'
import {init, job} from '..'

describe('job helper', () => {
  let specs = {}
  let runMock

  describe('max retries', () => {
    beforeEach(async () => {
      runMock = jest.fn(() => Promise.reject('some error'))
      specs = {
        eventJob: job({
          type: 'single',
          name: 'eventJob',
          maxRetries: 3,
          getNextRun: () => new Date(),
          run: runMock
        })
      }

      await init({
        jobs: specs,
        dbAddress: url,
        namespace: 'job'
      })
    })

    afterEach(async () => {
      await JobManager.stop()
      await JobManager.getAgenda().close({force: true})
      JobManager.clear()
    })

    it('retries the job 3 times before failing', async () => {
      const eventData = {
        example: true
      }
      await (specs as {eventJob: Job}).eventJob.schedule(eventData)

      await new Promise(r => setTimeout(r, 500))

      expect(runMock).toHaveBeenCalledTimes(3)
      expect(runMock.mock.calls[0][0].example).toEqual(true)
      expect(runMock.mock.calls[1][0].example).toEqual(true)
      expect(runMock.mock.calls[2][0].example).toEqual(true)
    })

    it('can schedule a job in the future', async () => {
      const eventData = {
        example: true
      }
      await (specs as {eventJob: Job}).eventJob.schedule(eventData, 'in 1 day')

      await new Promise(r => setTimeout(r, 500))

      expect(runMock).toHaveBeenCalledTimes(0)
    })
  })
})
