import JobsCollection from '../JobsCollection'
import {generateId} from '@orion-js/app'

export default async function(job) {
  const inDb = await JobsCollection.findOne({job: job.identifier})

  if (job.runEvery) {
    job.getNextRun = previous => {
      const date = previous ? previous.date : new Date()
      return new Date(date.getTime() + job.runEvery)
    }
  }

  if (!job.getNextRun) {
    throw new Error('Recurrent jobs must be created with getNextRun or runEvery')
  }

  if (!inDb) {
    // create next run
    const runAfter = await job.getNextRun()
    if (!runAfter) {
      throw new Error('You must specify getNextRun or runEvery for the job ' + job.identifier)
    }
    await JobsCollection.upsert(
      {job: job.identifier},
      {
        $set: {
          identifier: generateId(),
          runAfter
        }
      }
    )
  }
}
