import job from '../job'
import initJobs from './index'

describe('initJobs', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should add the identifier key to all jobs', async () => {
    const aJob = job({
      type: 'event'
    })

    const aJob2 = job({
      type: 'event'
    })

    await initJobs({aJob, aJob2})

    expect(aJob.identifier).toBe('aJob')
    expect(aJob2.identifier).toBe('aJob2')
  })

  it('Run a job fail if never init', done => {
    const aJob = job({
      type: 'event'
    })
    expect(aJob.identifier).toBe(undefined)
    aJob()
      .then(() => done(new Error('should have failed')))
      .catch(error => {
        expect(error.message).toBe('Job must be initialized in "start()" to be able to run')
        done()
      })
    jest.advanceTimersByTime(6000)
  })

  it('Wait for init', done => {
    const lateInitJob = job({
      type: 'event'
    })
    expect(lateInitJob.identifier).toBe(undefined)
    setTimeout(() => {
      initJobs({lateInitJob})
    }, 3000)
    lateInitJob()
      .then(() => done())
      .catch(done)
    jest.advanceTimersByTime(4000)
  })
})
