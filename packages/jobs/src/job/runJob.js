import JobsCollection from '../JobsCollection'
import {generateId} from '@orion-js/app'

export default async function (params, {identifier, waitToRun} = {}) {
  const getIdentifier = maxRetries =>
    new Promise((resolve, reject) => {
      if (this.identifier) return resolve(this.identifier)
      if (maxRetries <= 0)
        return reject(new Error('Job must be initialized in "start()" to be able to run'))
      setTimeout(() => {
        resolve(getIdentifier(maxRetries - 1))
      }, 1000)
    })

  await getIdentifier(5)

  identifier = identifier || generateId()

  if (this.type !== 'event') {
    throw new Error('You can only call event jobs, not ' + this.type)
  }

  let runAfter = new Date()
  if (waitToRun) {
    runAfter = new Date(Date.now() + waitToRun)
  }
  await JobsCollection.await()
  await JobsCollection.insert({
    job: this.identifier,
    identifier,
    params,
    runAfter
  })

  return identifier
}
