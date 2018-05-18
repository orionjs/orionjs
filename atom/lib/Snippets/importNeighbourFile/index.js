'use babel'
import debounce from 'lodash/debounce'
import getFiles from './getFiles'
import makeImporter from '../makeImporter'

const debouncedGetFiles = debounce(getFiles, 3000, {
  leading: true,
  trailing: false
})

export default function({file, prefix, preText}) {
  const files = debouncedGetFiles(file)
  if (prefix.trim().length < 2) return
  return files.filter(name => name.toLowerCase().startsWith(prefix.toLowerCase())).map(name => {
    if (preText.includes('<')) {
      // is a react component
      return makeImporter({
        snippet: `${name} $1/>`,
        displayText: `<${name} />`,
        description: `Complete and import the component ${name}`,
        imports: `import ${name} from './${name}'`,
        iconHTML: '<i class="icon-file-code"></i>',
        type: 'import',
        leftLabel: 'Component'
      })
    } else {
      return makeImporter({
        snippet: name,
        description: `Complete and import ${name}`,
        imports: `import ${name} from './${name}'`,
        iconHTML: '<i class="icon-file"></i>',
        type: 'import',
        leftLabel: 'File'
      })
    }
  })
}
