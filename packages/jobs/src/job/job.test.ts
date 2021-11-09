import {url} from '../test/setup'
import {JobManager} from '../JobManager'
import {Job} from '../types'
import {init, job} from '..'
import {JobIsNotUniqueError} from '../errors'

describe('job helper', () => {
  let specs = {}
  let runMock

  describe('single job opts', () => {
    beforeEach(async () => {
      runMock = jest.fn()
      specs = {
        singleJob: job({
          type: 'single',
          name: 'singleJob',
          maxRetries: 3,
          getNextRun: () => new Date(),
          run: runMock
        })
      }

      await init({
        jobs: specs,
        dbAddress: url,
        namespace: 'job_opts',
        disabled: true
      })
    })

    afterEach(async () => {
      await JobManager.stop()
      JobManager.clear()
    })

    describe('when checking for uniqueness', () => {
      it('checks for uniqueness when required', async () => {
        const data = {
          example: true
        }
        await (specs as {singleJob: Job}).singleJob.schedule(data, {
          uniqueness: {
            key: 'constKey'
          }
        })

        await expect(
          (specs as {singleJob: Job}).singleJob.schedule(data, {
            uniqueness: {
              key: 'constKey'
            }
          })
        ).rejects.toThrow(JobIsNotUniqueError)
      })

      it('ignores the error if the option is set', async () => {
        const data = {
          example: true
        }
        await (specs as {singleJob: Job}).singleJob.schedule(data, {
          uniqueness: {
            key: 'constKey'
          }
        })

        await expect(
          (specs as {singleJob: Job}).singleJob.schedule(data, {
            uniqueness: {
              key: 'constKey',
              ignoreError: true
            }
          })
        ).resolves.not.toThrow()
      })
    })
  })

  describe('job retrying', () => {
    beforeEach(async () => {
      runMock = jest.fn(() => Promise.reject('some error'))
      specs = {
        singleJob: job({
          type: 'single',
          name: 'singleJob',
          maxRetries: 3,
          getNextRun: () => new Date(),
          run: runMock
        })
      }

      await init({
        jobs: specs,
        dbAddress: url,
        namespace: 'job_retry'
      })
    })

    afterEach(async () => {
      await JobManager.stop()
      JobManager.clear()
    })

    it('retries the job 3 times before failing', async () => {
      const data = {
        example: true
      }
      await (specs as {singleJob: Job}).singleJob.schedule(data)

      await new Promise(r => setTimeout(r, 500))

      expect(runMock).toHaveBeenCalledTimes(3)
      expect(runMock.mock.calls[0][0].example).toEqual(true)
      expect(runMock.mock.calls[1][0].example).toEqual(true)
      expect(runMock.mock.calls[2][0].example).toEqual(true)
      expect(runMock.mock.calls[0][1].timesExecuted).toEqual(0)
      expect(runMock.mock.calls[1][1].timesExecuted).toEqual(1)
      expect(runMock.mock.calls[2][1].timesExecuted).toEqual(2)
    })

    it('can schedule a job in the future', async () => {
      const data = {
        example: true
      }
      await (specs as {singleJob: Job}).singleJob.schedule(data, {
        runAt: 'in 500 milliseconds'
      })

      expect(runMock).toHaveBeenCalledTimes(0)

      await new Promise(r => setTimeout(r, 1000))

      expect(runMock).toHaveBeenCalledTimes(0)
    })
  })

  describe('misc checks', () => {
    it('can schedule without explicitly starting agenda', async () => {
      runMock = jest.fn(() => Promise.reject('some error'))
      specs = {
        singleJob: job({
          type: 'single',
          name: 'singleJob',
          maxRetries: 3,
          getNextRun: () => new Date(),
          run: runMock
        })
      }

      await init({
        jobs: specs,
        dbAddress: url,
        namespace: 'job_misc',
        disabled: true
      })

      const data = {
        example: true
      }
      await (specs as {singleJob: Job}).singleJob.schedule(data)

      await new Promise(r => setTimeout(r, 500))

      expect(runMock).toHaveBeenCalledTimes(0)

      await JobManager.stop()
    })
  })
})
