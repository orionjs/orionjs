export default function ({name, legacy}) {
  if (legacy)
    return `import {Model} from '@orion-js/app'

export default new Model({
  name: '${name}',
  schema: () => require('./schema'),
  resolvers: () => require('./resolvers')
})`

  return `import {Prop, ResolverProp, TypedModel} from '@orion-js/typed-model'
import exampleResolver from './exampleResolver'

@TypedModel()
export default class Example {
  /**
   * The name of the ...
   */
  @Prop()
  name: string

  /**
   * Other property
   */
  @Prop()
  numericProperty: number

  /**
   * A resolver
   */
  @ResolverProp(exampleResolver)
  exampleResolver: typeof exampleResolver.modelResolve
}`
}
