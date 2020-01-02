export default ({rawCollection}) =>
  function watch(pipeline, options) {
    return rawCollection.watch(pipeline, options)
  }
