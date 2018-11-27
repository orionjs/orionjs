import JobsCollection from '../JobsCollection'
import {generateId} from '@orion-js/app'

export default async function(job) {
  const inDb = await JobsCollection.findOne({job: job.identifier})

  if (job.runEvery) {
    job.getNextRun = () => new Date(Date.now() + job.runEvery)
  }

  if (!job.getNextRun) {
    throw new Error('Recurrent jobs must be created with getNextRun or runEvery')
  }

  if (!inDb) {
    // create next run
    await JobsCollection.upsert(
      {job: job.identifier},
      {
        $set: {
          identifier: generateId(),
          runAfter: job.getNextRun()
        }
      }
    )
  }
}
