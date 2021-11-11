import {getJobUniquenessKeysCollection} from '../collections/getJobUniquenessKeysCollection'
import {JobIsNotUniqueError} from '../errors/JobIsNotUnique'

/**
 * Validates that the uniqueness key has not been used.
 * If it was used, it will throw an error (unless ignoreUniquenessError is set to true).
 * Inserts a key if it was not used.
 * @param uniquenessKey The uniqueness key to validate.
 * @param ignoreUniquenessError If true, will not throw an error if the uniqueness key has been used (will omit executing the job silently)
 * @returns true if the uniqueness key has not been used, false if it has.
 */
export const jobUniquenessCheck = async (
  uniquenessKey?: string,
  ignoreUniquenessError = false
): Promise<boolean> => {
  if (!uniquenessKey) {
    return true
  }

  const JobUniquenessKeys = getJobUniquenessKeysCollection()
  const existingJob = await JobUniquenessKeys.findOne({key: uniquenessKey})
  if (existingJob) {
    if (ignoreUniquenessError) {
      return false
    }

    throw new JobIsNotUniqueError(uniquenessKey)
  }

  await JobUniquenessKeys.insertOne({
    key: uniquenessKey
  })

  return true
}
