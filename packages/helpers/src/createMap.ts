/**
 * Creates a map (object) from an array of items, using a specified property as the key.
 * 
 * This utility transforms an array of objects into a lookup object/dictionary where
 * each item in the array becomes a value in the map, indexed by the specified property.
 * If multiple items have the same key value, only the last one will be preserved.
 * 
 * @template T The type of items in the input array
 * @param array - The input array of items to transform into a map
 * @param key - The property name to use as keys in the resulting map (defaults to '_id')
 * @returns A record object where keys are values of the specified property and values are the original items
 * 
 * @example
 * // Returns { '1': { id: 1, name: 'Item 1' }, '2': { id: 2, name: 'Item 2' } }
 * createMap([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }], 'id')
 */
export default function createMap<T>(array: Array<T>, key: string = '_id'): Record<string, T> {
  const map = {}

  for (const item of array) {
    map[item[key]] = item
  }

  return map
}
