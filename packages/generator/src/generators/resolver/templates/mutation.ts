export default function ({legacy}: {legacy: boolean}) {
  if (legacy)
    return `import {resolver} from '@orion-js/app'
import Examples from 'app/collections/Examples'
import Example from 'app/models/Example'

export default resolver({
  params: {
    parameter1: {
      type: String
    },
    parameter2: {
      type: String
    }
  },
  returns: Boolean,
  mutation: true,
  async resolve({parameter1, parameter2}, viewer) {
    const example = await Examples.findOne(parameter1)
    await example.update({$set: {parameter2: parameter2}})
    return true
  }
})`

  return `import {resolver} from '@orion-js/resolvers'

export default resolver({
  params: {},
  returns: String,
  mutation: true,
  async resolve(params, viewer) {
    return 'mutated'
  }
})`
}
