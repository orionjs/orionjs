import {capitalize} from '../../../helpers/capitalize'

export default function ({name, legacy}: {name: string; legacy: boolean}) {
  if (legacy)
    return `import {Collection} from '@orion-js/app'

export default new Collection({
  name: '${name.toLowerCase()}',
  model: null,
  indexes: []
})`

  return `import {createCollection} from '@orion-js/mongodb'
import Example from 'app/components/${capitalize(name)}/models/Example'
  
export default createCollection<Example>({
  name: 'test.example',
  model: Example,
  indexes: [
    {
      keys: {
        name: 1
      },
      options: {
        unique: true
      }
    }
  ]
})`
}
