import job from '../job'
import initJobs from './index'

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
