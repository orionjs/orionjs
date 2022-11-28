import {resolver} from '@orion-js/resolvers'
import getModel from './getModel'
import getParams from './params'
import setOptions from './setOptions'
import {getArgs} from '@orion-js/resolvers/lib/resolver/getArgs'

export interface PaginatedCursor {
  count?: () => Promise<number> | number
  toArray: () => Promise<any[]>
  limit?: (newLimit: number) => void
  skip?: (newSkip: number) => void
  sort?: (newSort: {[key: string]: 1 | -1}) => void
}

export type PaginatedResolverGetCursorResultWithCount = {
  count: () => Promise<number> | number
  cursor: PaginatedCursor
}

export type PaginatedResolverGetCursorResult =
  | PaginatedCursor
  | PaginatedResolverGetCursorResultWithCount

export interface PaginatedResolverOpts {
  returns: any
  getCursor: (params?: any, viewer?: any) => Promise<PaginatedResolverGetCursorResult>
  allowedSorts?: string[]
  defaultSortBy?: string
  defaultSortType?: 'asc' | 'desc'
  params?: any
  modelName?: string
  permissionsOptions?: any
}

export default function paginatedResolver({
  returns,
  params,
  allowedSorts,
  defaultSortBy,
  defaultSortType,
  getCursor,
  getCursorAndCount,
  modelName,
  ...otherOptions
}: PaginatedResolverOpts & {[key: string]: any}) {
  const getCursorResult = async (...args) => {
    const result = await getCursor(...args)
    if ((result as PaginatedResolverGetCursorResultWithCount).cursor) {
      const resultWithCount = result as PaginatedResolverGetCursorResultWithCount
      return {cursor: resultWithCount.cursor, getCount: () => resultWithCount.count()}
    } else {
      const resultWithoutCount = result as PaginatedCursor
      return {cursor: resultWithoutCount, getCount: () => resultWithoutCount.count()}
    }
  }

  return resolver({
    params: getParams({params, allowedSorts, defaultSortBy, defaultSortType}),
    returns: getModel({modelName, returns}),
    async resolve(...args) {
      const {params, viewer} = getArgs(...args)
      const {cursor, getCount} = await getCursorResult(...args)

      /* counting the total number of elements of this cursor, so we make sure
       that it is going to be computed only once */
      const count = await getCount()
      const options = setOptions(params, cursor)

      return {
        cursor,
        params,
        viewer,
        options,
        count
      }
    },
    ...otherOptions
  })
}
