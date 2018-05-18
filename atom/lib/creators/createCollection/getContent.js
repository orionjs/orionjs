'use babel'

export default function({path, name}) {
  return `import {Collection} from '@orion-js/app'

export default new Collection({
  name: '${name.toLowerCase()}',
  model: null,
  indexes: []
})
`
}
