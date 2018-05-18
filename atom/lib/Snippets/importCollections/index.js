'use babel'
import debounce from 'lodash/debounce'
import getCollections from './getCollections'
import makeImporter from '../makeImporter'

const debouncedGetCollections = debounce(getCollections, 3000, {
  leading: true,
  trailing: false
})

export default function({file, prefix, preText}) {
  const collections = debouncedGetCollections(file)
  if (prefix.trim().length < 2) return
  return collections.filter(name => name.startsWith(prefix)).map(name => {
    return makeImporter({
      snippet: `await ${name}.`,
      displayText: name,
      iconHTML: '<i class="icon-database"></i>',
      description: `Complete and import collection ${name}`,
      imports: `import ${name} from 'app/collections/${name}'`,
      rightLabel: `await ${name}.`,
      type: 'type',
      leftLabel: 'Collection'
    })
  })
}
