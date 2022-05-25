import {resolver} from '@orion-js/resolvers'
import getModel from './getModel'
import getParams from './params'
import setOptions from './setOptions'
import {getArgs} from '@orion-js/resolvers/lib/resolver/getArgs'
import {Collection, FindCursor} from '@orion-js/mongodb'

export interface PaginatedResolverOpts<T = any> {
  returns: any
  collection?: Collection<T>
  params?: object
  getCursor: (params?: any, viewer?: any) => Promise<FindCursor<T>>
  modelName?: string
  permissionsOptions?: any
}

export default function paginatedResolver<T = any>({
  returns,
  collection,
  params,
  getCursor,
  modelName,
  ...otherOptions
}: PaginatedResolverOpts<T> & {[key: string]: any}) {
  const getPaginatedCursor = async (...args) => {
    if (getCursor) {
      return await getCursor(...args)
    }
    return collection.find({})
  }

  return resolver({
    params: getParams({params}),
    returns: getModel({modelName, returns}),
    async resolve(...args) {
      const {params, viewer} = getArgs(...args)
      const cursor = await getPaginatedCursor(...args)

      /* counting the total number of elements of this cursor, so we make sure
       that it is going to be computed only once */
      const count = await cursor.count()
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
