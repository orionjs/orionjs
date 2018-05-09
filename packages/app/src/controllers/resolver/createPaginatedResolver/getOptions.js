export default function({page, limit}) {
  if (typeof limit === 'undefined') limit = 20
  if (typeof page === 'undefined') page = 1

  const skip = limit * (page - 1)

  return {
    skip,
    limit
  }
}
