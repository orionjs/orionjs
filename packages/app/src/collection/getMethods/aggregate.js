export default ({getRawCollection}) =>
  function aggregate(pipeline) {
    const rawCollection = getRawCollection()
    return rawCollection.aggregate(pipeline)
  }
