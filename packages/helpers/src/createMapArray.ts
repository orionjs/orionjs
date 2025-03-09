/**
 * Creates a grouped map from an array of items, using a specified property as the key.
 * 
 * This utility transforms an array of objects into a lookup object/dictionary where
 * each value is an array of items sharing the same key value. Unlike createMap,
 * this function preserves all items with the same key by grouping them in arrays.
 * 
 * @template T The type of items in the input array
 * @param array - The input array of items to transform into a grouped map
 * @param key - The property name to use as keys in the resulting map (defaults to '_id')
 * @returns A record object where keys are values of the specified property and values are arrays of items
 * 
 * @example
 * // Returns { 'category1': [{ id: 1, category: 'category1' }, { id: 3, category: 'category1' }], 
 * //           'category2': [{ id: 2, category: 'category2' }] }
 * createMapArray([
 *   { id: 1, category: 'category1' }, 
 *   { id: 2, category: 'category2' }, 
 *   { id: 3, category: 'category1' }
 * ], 'category')
 */
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
