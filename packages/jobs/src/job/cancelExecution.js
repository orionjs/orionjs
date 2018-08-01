import JobsCollection from '../JobsCollection'

export default async function(params, {identifier} = {}) {
  const job = this.identifier
  if (identifier) {
    await JobsCollection.remove({job, identifier})
  } else if (params) {
    await JobsCollection.remove({job, params})
  } else {
    await JobsCollection.remove({job})
  }
}
