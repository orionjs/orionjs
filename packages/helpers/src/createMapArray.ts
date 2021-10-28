interface CreateMapArrayItemsMap<T> {
  [key: string]: T
}

export default function createMapArray<T>(
  array: Array<T>,
  key: string = '_id'
): CreateMapArrayItemsMap<T> {
  const map = {}

  for (const item of array) {
    map[item[key]] = map[item[key]] || []
    map[item[key]].push(item)
  }

  return map
}
