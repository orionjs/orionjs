'use babel'
import fs from 'fs-plus'
const getModelName = function(path) {
  const filePath = path.replace(/\/resolvers$/, '/index.js')
  const modelDefinition = fs.readFileSync(filePath).toString()
  const modelName = modelDefinition.split("name: '")[1].split("',")[0]
  if (modelName.includes(' ')) return 'parent'
  return modelName.charAt(0).toLowerCase() + modelName.slice(1)
}

export default function({path, name, isRoot}) {
  const parent = `${isRoot ? '' : `${getModelName(path)}, `}`
  return `import {resolver} from '@orion-js/app'

export default resolver({
  params: {},
  returns: String,
  mutation: false,
  async resolve(${parent}params, viewer) {
    
  }
})
`
}
