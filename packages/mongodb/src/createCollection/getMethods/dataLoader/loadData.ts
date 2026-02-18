import {createMapArray} from '@orion-js/helpers'
import {Collection, DataLoader, ModelClassBase, ModelToMongoSelector} from '../../../types'
import dataLoad from './dataLoad'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) {
  const loadData: DataLoader.LoadData<DocumentType> = async options => {
    await collection.connectionPromise

    const result = await dataLoad({
      loaderKey: {
        key: options.key,
        match: options.match,
        sort: options.sort,
        project: options.project,
        collectionName: collection.name,
      },
      id: options.value,
      ids: options.values,
      timeout: options.timeout,
      load: async values => {
        const query = {
          ...(options.match || {}),
          [options.key]: {$in: values},
        } as ModelToMongoSelector<DocumentType>

        // Use secondaryPreferred to distribute read load across replicas
        const cursor = collection.find(query, {readPreference: 'secondaryPreferred'})

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

        const itemsMap = createMapArray(items, options.key as string)
        return values.map(value => {
          return itemsMap[value] || []
        })
      },
    })

    return result
  }

  return loadData
}
