'use babel'
import debounce from 'lodash/debounce'
import getModels from './getModels'
import makeImporter from '../makeImporter'

const debouncedGetModels = debounce(getModels, 3000, {
  leading: true,
  trailing: false
})

export default function({file, prefix, preText}) {
  const models = debouncedGetModels(file)
  if (prefix.trim().length < 2) return
  return models.filter(name => name.startsWith(prefix)).map(name => {
    return makeImporter({
      snippet: name,
      description: `Complete and import model ${name}`,
      imports: `import ${name} from 'app/models/${name}'`
    })
  })
}
