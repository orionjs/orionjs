export default function (array, key = '_id') {
  const map = {}

  for (const item of array) {
    map[item[key]] = map[item[key]] || []
    map[item[key]].push(item)
  }

  return map
}
