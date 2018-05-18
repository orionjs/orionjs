'use babel'

export default function({path, name}) {
  return `import {Model} from '@orion-js/app'
import resolvers from './resolvers'
import schema from './schema'

export default new Model({
  name: '${name}',
  schema,
  resolvers
})
`
}
