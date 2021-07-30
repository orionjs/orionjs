export default ({rawCollection}) =>
  function aggregate(pipeline, options = {}) {
    return rawCollection.aggregate(pipeline, options)
  }
