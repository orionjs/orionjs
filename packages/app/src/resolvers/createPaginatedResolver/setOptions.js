export default function({page, limit}, cursor) {
  if (typeof limit === 'undefined') limit = 20
  if (typeof page === 'undefined') page = 1

  const skip = limit * (page - 1)

  cursor.limit(limit)
  cursor.skip(skip)

  return {
    skip,
    limit
  }
}
