export default function({page, limit}, cursor) {
  const skip = limit * (page - 1)

  if (limit) {
    cursor.limit(limit)
  }

  if (skip) {
    cursor.skip(skip)
  }

  return {
    skip,
    limit
  }
}
