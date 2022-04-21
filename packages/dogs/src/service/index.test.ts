import {getServiceJobs, Job, Jobs} from '.'

describe('Jobs (dogs) with service injections', () => {
  it('Should define a jobs map using services', async () => {
    @Jobs()
    class ExampleJobsService {
      @Job({type: 'event'})
      async job1() {
        return {}
      }
    }

    const jobs = getServiceJobs(ExampleJobsService)

    expect(jobs).toMatchObject({
      job1: {
        type: 'event',
        resolve: expect.any(Function)
      }
    })
  })
})
