import {EventJob, getServiceJobs, Jobs, RecurrentJob} from '.'

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
