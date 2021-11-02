import {createMap, createMapArray} from '@orion-js/helpers'
import {DataLoader, Collection} from '../../../types'
import cloneDeep from 'lodash/cloneDeep'
import dataLoad from './dataLoad'

export default function <ModelClass>(collection: Collection) {
  const loadData: DataLoader.LoadData<ModelClass> = async options => {
    const result = await dataLoad({
      loaderKey: {
        key: options.key,
        match: options.match,
        sort: options.sort,
        project: options.project,
        collectionName: collection.name
      },
      id: options.value,
      ids: options.values,
      timeout: options.timeout,
      load: async values => {
        const query: typeof options.match = cloneDeep(options.match) || {}
        query[options.key] = {$in: values}

        const cursor = collection.find(query)

        if (options.sort) {
          cursor.sort(options.sort)
        }

        if (options.project) {
          cursor.project(options.project)
        }

        if (options.debug) {
          console.info(`Will execute data loading query now on ${collection.name}: `, query)
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

  return loadData
}
