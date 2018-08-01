import JobsCollection from '../JobsCollection'
import {generateId} from '@orion-js/app'

export default async function(params, {identifier, waitToRun} = {}) {
  if (!this.identifier) {
    throw new Error('Job must be initialized in "start()" to be able to run')
  }
  identifier = identifier || generateId()

  let runAfter = new Date()
  if (waitToRun) {
    runAfter = new Date(Date.now() + waitToRun)
  }

  await JobsCollection.insert({
    job: this.identifier,
    identifier,
    params,
    runAfter
  })

  return identifier
}
