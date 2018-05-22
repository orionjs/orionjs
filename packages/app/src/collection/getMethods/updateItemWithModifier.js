export default function(item, modifier) {
  const operations = Object.keys(modifier)
  for (const operationType of operations) {
    const operationDoc = modifier[operationType]
    for (const key of Object.keys(operationDoc)) {
      if (key.includes('.')) continue
      const value = operationDoc[key]

      if (operationType === '$set') {
        item[key] = value
      }
      if (operationType === '$unset') {
        item[key] = null
      }
    }
  }
}
