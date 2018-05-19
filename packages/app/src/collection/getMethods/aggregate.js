export default ({rawCollection}) =>
  function aggregate(pipeline) {
    return rawCollection.aggregate(pipeline)
  }
