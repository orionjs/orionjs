export default function createMap<T>(array: Array<T>, key: string = '_id'): Record<string, T> {
  const map = {}

  for (const item of array) {
    map[item[key]] = item
  }

  return map
}
