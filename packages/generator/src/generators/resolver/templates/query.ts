export default function ({legacy}: {legacy: boolean}) {
  if (legacy)
    return `import {resolver} from '@orion-js/app'
import Examples from 'app/collections/Examples'
import Example from 'app/models/Example'

export default resolver({
  params: {
    parameter1: {
      type: String
    }
  },
  returns: Example,
  mutation: false,
  async resolve(params, viewer) {
    const {parameter1} = params
    const response = await Examples.findOne(parameter1)
    return response
  }
})`

  return `import {resolver} from '@orion-js/resolvers'

export default resolver({
  params: {},
  returns: String,
  async resolve(params, viewer) {
    return ${'Hello world ${viewer.email}'}
  }
})`
}
