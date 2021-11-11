import {getJobRetriesCollection} from './getJobRetriesCollection'

it('should connect to the database correctly', async () => {
  const JobRetries = getJobRetriesCollection()
  await JobRetries.findOne()

  await JobRetries.createIndexesPromise
})
