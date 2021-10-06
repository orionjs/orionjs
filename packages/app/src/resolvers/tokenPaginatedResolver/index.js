import resolver from '../resolver'
import getReturnModel from './getReturnModel'
import getArgs from '../resolver/getResolver/getArgs'

export default function ({collection, params, resolve, ...otherOptions}) {
  /* executes the resolve function, obtaining the query that will
   be applied to the collection */
  const runResolve = async (...args) => {
    if (resolve) {
      return await resolve(...args)
    }
    return {query: {}}
  }

  /* This function does the query to the collection, ensuring that the result
     ids are bigger than a certain offset if it was provided, returning only
     the requested number of elements */
  const getCursor = async ({query, sort: sortingCriteria, limit, idOffset}) => {
    /* If the resolver doesn't have a sortingCriteria or it's empty, the results
       will be sorted by _id */
    if (!sortingCriteria || !Object.keys(sortingCriteria).length) {
      sortingCriteria = {_id: 1}
      if (idOffset) query = {...query, _id: {$gt: idOffset}}
    } else {
      /* If we are here, we are sure that we have a sortingCriteria and it has
         only one field */
      const sortingField = Object.keys(sortingCriteria)[0]

      /* Extending the sorting criteria with _id, so we can break the ties when
         we have documents with the same sortingCriteria value spanning multiple
         pages */
      sortingCriteria = {...sortingCriteria, _id: 1}

      /* If we receive an offset, we have to modify the query in order to get
         the correct next document */
      if (idOffset) {
        /* Getting the document referenced by the idOffset */
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

        /* If we have an increasing order, we want the next document to be greater than the
           last one seen. But if it's decreasing order, we want the next document
           to be LOWER than that last one seen. */
        const sortOperator = sortingCriteria[sortingField] === 1 ? '$gt' : '$lt'
        query = {
          $or: [
            {...restOfQuery, [sortingField]: offsetDocument[sortingField], _id: {$gt: idOffset}},
            {...query, [sortingField]: {[sortOperator]: offsetDocument[sortingField]}}
          ]
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

        /* If the query restriction for this field is an object, we have to validate
           that this object is valid */
        if (typeof query[field] === 'object') validateQuery(query[field])
        else if (Array.isArray(query[field])) {
          /* If the restriction for this field is an array (like for $and), then we
             have to validate that each one of the array elements are valid */
          query[field].forEach(queryElement => validateQuery(queryElement))
        }
      })
    }
  }

  return resolver({
    params: {
      ...params,
      idOffset: {
        type: 'ID',
        optional: true
      },
      limit: {
        type: 'integer',
        defaultValue: 10,
        min: 1,
        max: 200
      }
    },
    returns: getReturnModel({...otherOptions, collection}),
    async resolve(...args) {
      const {callParams: params, viewer} = getArgs(...args)
      const {query, sort} = await runResolve(...args)

      if (!query) throw new Error("'query' object not found in return of resolve function")

      await validateQuery(query)

      if (sort && Object.keys(sort).length > 1)
        throw new Error('sorting criteria supports at most one field')

      const cursor = await getCursor({...params, query, sort})

      return {
        params,
        cursor,
        viewer
      }
    },
    ...otherOptions
  })
}
