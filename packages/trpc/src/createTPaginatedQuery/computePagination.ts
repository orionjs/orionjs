export interface PaginationMetadata {
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function computeSkip(page: number, limit: number): number {
  return limit * (page - 1)
}

export function computePagination(params: {
  page: number
  limit: number
  totalCount: number
}): PaginationMetadata {
  const {page, limit, totalCount} = params

  const totalPages = limit > 0 ? Math.ceil(totalCount / limit) : 1
  const skip = computeSkip(page, limit)
  const hasNextPage = limit > 0 && skip + limit < totalCount
  const hasPreviousPage = totalCount > 0 && skip > 0

  return {
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  }
}
