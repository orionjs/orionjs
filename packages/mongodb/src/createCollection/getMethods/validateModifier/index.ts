// inspired by https://github.com/aldeed/simple-schema-js
import validateOperator from './validateOperator'

export default async function validateModifier(schema, modifier) {
  for (const operation of Object.keys(modifier)) {
    const operationDoc = modifier[operation]
    // If non-operators are mixed in, throw error
    if (operation.slice(0, 1) !== '$') {
      throw new Error(`Expected '${operation}' to be a modifier operator like '$set'`)
    }

    await validateOperator({schema, operationDoc, operation})
  }
}
