'use babel'
import makeCreator from '../makeCreator'

export default makeCreator(function({path, name, createFile}) {
  createFile(
    `${name}.js`,
    `import {resolver} from '@orion-js/app'

export default resolver({
  name: '${name}',
  params: {},
  returns: Model,
  mutation: false,
  resolve: async function(params, viewer) {
    return 
  }
})
`
  )
})
