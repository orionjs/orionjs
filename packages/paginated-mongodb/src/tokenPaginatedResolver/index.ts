import {createResolver} from '@orion-js/resolvers'
import getReturnModel from './getReturnModel'
import {getResolverArgs} from '@orion-js/resolvers'

export default function ({collection, params, resolve, ...otherOptions}) {
  /* executes the resolve function, obtaining the query that will
   be applied to the collection */
  const runResolve = async (...args: any[]) => {
    if (resolve) {
      return await resolve(...args)
    }
    return {query: {}}
  }

  /* This function does the query to the collection. The logic is based 
     in this article:
     https://medium.com/swlh/mongodb-pagination-fast-consistent-ece2a97070f3 */
  const getCursor = async ({query, sort: sortingCriteria, limit, idOffset}) => {
    if (sortingCriteria && Object.keys(sortingCriteria).length > 1)
      throw new Error('sorting criteria supports at most one field')

    if (!sortingCriteria || !Object.keys(sortingCriteria).length) {
      sortingCriteria = {_id: 1}
      if (idOffset) query = {...query, _id: {$gt: idOffset}}
    } else {
      const sortingField = Object.keys(sortingCriteria)[0]

      sortingCriteria = {...sortingCriteria, _id: 1}

      if (idOffset) {
        const offsetDocument = await collection.findOne({_id: idOffset})

        const {[sortingField]: originalSortingFieldQuery, ...restOfQuery} = query

        /* Suppose the following documents, and pages with 2 elements on each page:
          [
            {_id: 1, name: 'a', v: 1},
            {_id: 2, name: 'b', v: 2},
            {_id: 3, name: 'c', v: 2},
            {_id: 4, name: 'd', v: 3},
            {_id: 5, name: 'e', v: 4},
          ]

          If the query results are sorted by {v: 1}, then the first page will
          contain the documents with ids 1 & 2, and the last one will be the document
          with id 2.
          In order to get the documents of the second page, we cannot get the documents
          with the sorting criteria (v) greater than the last document, because we
          would skip the document with id 3. In that case, we need to get all the
          documents where either:
           1.- The sorting field is the same than the last one, and the _id field is greater
           2.- The sorting field is greater than the last one.

          In this case, we can get the documents of the second page with the following query:

            {
              $or: [
                {
                    v: 2,
                    _id: {$gt: 2}
                },
                {
                    v: {$gt: 2}
                }
              ]
            }

          For decreasing order it is exactly the same, but the second part of the or has
          to be changed for $lt.
          */
        const sortOperator = sortingCriteria[sortingField] === 1 ? '$gt' : '$lt'
        query = {
          $or: [
            {...restOfQuery, [sortingField]: offsetDocument[sortingField], _id: {$gt: idOffset}},
            {...query, [sortingField]: {[sortOperator]: offsetDocument[sortingField]}},
          ],
        }
      }
    }

    return collection.find(query).sort(sortingCriteria).limit(limit)
  }

  const validateQuery = async query => {
    if (typeof query === 'object') {
      const fields = Object.keys(query)

      fields.forEach(field => {
        if (['$or', '$expr'].includes(field)) {
          throw new Error("tokenPaginatedResolvers don't support $or nor $expr on query")
        }

        if (typeof query[field] === 'object') validateQuery(query[field])
        else if (Array.isArray(query[field]))
          query[field].forEach(queryElement => validateQuery(queryElement))
      })
    }
  }

  const {modelName} = otherOptions

  return createResolver({
    params: {
      ...params,
      idOffset: {
        type: 'ID',
        optional: true,
      },
      limit: {
        type: 'integer',
        defaultValue: 10,
        min: 1,
        max: 200,
      },
    } as any,
    returns: getReturnModel({modelName, collection}) as any,
    async resolve(...args) {
      const {params, viewer} = getResolverArgs(...args)
      const {query, sort} = await runResolve(...args)

      if (!query) throw new Error("'query' object not found in return of resolve function")

      await validateQuery(query)

      const cursor = await getCursor({...params, query, sort})

      return {
        params,
        cursor,
        viewer,
      }
    },
    ...otherOptions,
  })
}
