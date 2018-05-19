'use babel'

export default function({path, name}) {
  return `import {Model} from '@orion-js/app'

export default new Model({
  name: '${name}',
  schema: () => require('./schema'),
  resolvers: () => require('./resolvers')
})
`
}
