export default function ({legacy}: {legacy: boolean}) {
  if (legacy)
    return `export default {
}`

  return `import {modelResolver} from '@orion-js/resolvers'
import {Prop, TypedModel} from '@orion-js/typed-model'
import Example from '..'

@TypedModel()
class Params {
@Prop()
param1: text
}

export default modelResolver({
params: Params,
returns: 'string',
async resolve(example: Example, params: Params) {

    return param1.toUpperCase()
}
})`
}
