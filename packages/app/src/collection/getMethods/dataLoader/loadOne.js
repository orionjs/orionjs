export default function (dataLoad, {collection}) {
  return async options => {
    const [result] = await collection.loadMany(options)
    return result
  }
}
