import {PaginatedCursor} from './index'

export default function ({page, limit, sortBy, sortType}, cursor: PaginatedCursor) {
  const skip = limit * (page - 1)

  if (limit && cursor.limit) {
    cursor.limit(limit)
  }

  if (skip && cursor.skip) {
    cursor.skip(skip)
  }

  if (sortBy && sortType && cursor.sort) {
    cursor.sort({
      [`${sortBy}`]: sortType === 'asc' ? 1 : -1,
    })
  }

  return {
    skip,
    limit,
  }
}
