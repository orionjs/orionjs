export default function ({legacy}: {legacy: boolean}) {
  if (!legacy) throw new Error("paginated resolvers generation isn't implemented for orion v3")

  return `import {paginatedResolver} from '@orion-js/app'
import Example from 'app/models/Example'
import Examples from 'app/collections/Examples'
    
export default paginatedResolver({
  params: {
    parameter1: {
      type: String
    }
  },
  returns: Example,
  async getCursor({parameter1}, viewer) {
    const examples = await Examples.find(parameter1)
    return examples
  }
})`
}
