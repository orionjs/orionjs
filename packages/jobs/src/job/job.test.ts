import {url} from '../test/setup'
import {JobManager} from '../JobManager'
import {init, job, TriggerEventTypeJob} from '..'

describe('job helper', () => {
  let specs = {}
  let runMock

  describe('max retries', () => {
    beforeEach(async () => {
      runMock = jest.fn(() => Promise.reject('some error'))
      specs = {
        eventJob: job({
          type: 'event',
          name: 'eventJob',
          maxRetries: 3,
          getNextRun: () => new Date(),
          run: runMock
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

    it('retries the job 3 times before failing', async () => {
      const eventData = {
        example: true
      }
      await (specs as {eventJob: TriggerEventTypeJob}).eventJob(eventData)

      await new Promise(r => setTimeout(r, 1000))

      expect(runMock).toHaveBeenCalledTimes(3)
      expect(runMock.mock.calls[0][0].example).toEqual(true)
      expect(runMock.mock.calls[1][0].example).toEqual(true)
      expect(runMock.mock.calls[2][0].example).toEqual(true)
    })
  })
})
