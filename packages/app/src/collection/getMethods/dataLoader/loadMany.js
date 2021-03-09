import createMapArray from '../../../helpers/createMapArray'
import config from '../../../config'

export default function (dataLoad) {
  return async options => {
    const result = await dataLoad({
      loaderKey: {
        key: options.key,
        match: options.match,
        sort: options.sort,
        project: options.project
      },
      id: options.value,
      ids: options.values,
      timeout: options.timeout,
      load: async (values, {collection}) => {
        const query = {
          ...options.match,
          [options.key]: {$in: values}
        }

        const cursor = collection.find(query)

        if (options.sort) {
          cursor.sort(options.sort)
        }

        if (options.project) {
          cursor.project(options.project)
        }

        if (options.debug) {
          const {logger} = config()
          logger.info(`Will execute data loading query now on ${collection.name}: `, query)
        }

        const items = await cursor.toArray()

        const itemsMap = createMapArray(items, options.key)
        return values.map(value => {
          return itemsMap[value] || []
        })
      }
    })

    return result
  }
}
