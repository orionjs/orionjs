import {getJobUniquenessKeysCollection} from './getJobUniquenessKeysCollection'

it('should connect to the database correctly', async () => {
  const JobUniquenessKeys = getJobUniquenessKeysCollection()
  await JobUniquenessKeys.findOne()

  await JobUniquenessKeys.createIndexesPromise
})
