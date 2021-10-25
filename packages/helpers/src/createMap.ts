interface CreateMapItemsMap<T> {
  [key: string]: T
}

export default function createMap<T>(array: Array<T>, key: string = '_id'): CreateMapItemsMap<T> {
  const map = {}

  for (const item of array) {
    map[item[key]] = item
  }

  return map
}
