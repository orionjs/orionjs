export default function (dataLoad, {collection}) {
  return async id => {
    const result = await collection.loadOne({
      key: '_id',
      value: id
    })

    return result
  }
}
