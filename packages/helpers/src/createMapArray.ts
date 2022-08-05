export default function createMapArray<T>(
  array: Array<T>,
  key: string = '_id'
): Record<string, Array<T>> {
  const map = {}

  for (const item of array) {
    map[item[key]] = map[item[key]] || []
    map[item[key]].push(item)
  }

  return map
}
