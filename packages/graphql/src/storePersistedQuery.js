export const APQ_CACHE_PREFIX = 'apq:'

function createSHA(algorithm) {
  return require('crypto').createHash(algorithm)
}

function computeQueryHash(query) {
  return createSHA('sha256').update(query).digest('hex')
}

export default async function storePersistedQuery(apolloConfig, params) {
  const queryCache = apolloConfig.persistedQueries.cache
  if (!queryCache) {
    return
  }

  if (params.request.method !== 'POST') {
    return
  }

  const data = await params.getBodyJSON()

  if (!data?.query) {
    return
  }

  const hash = APQ_CACHE_PREFIX + computeQueryHash(data.query)

  const ttl =
    apolloConfig.persistedQueries?.ttl !== undefined ? apolloConfig.persistedQueries.ttl : 60 * 15

  await queryCache.set(hash, data.query, {ttl})
}
