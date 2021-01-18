import getArgs from '../getArgs'
import reportError from '../../reportError'

export default function ({resolver, getGraphQLType, options, model}) {
  const type = getGraphQLType(resolver.returns, options)
  const args = getArgs(resolver.params)
  return {
    type,
    args,
    async resolve(item, params, context) {
      try {
        const result = await resolver.resolve(item, params, context)
        return result
      } catch (error) {
        console.error('Error at resolver "' + resolver.key + '" of model "' + model.name + '":')
        console.error(error)
        reportError(options, error, {
          user: context.userId,
          websiteId: context.websiteId,
          resolver: resolver.key,
          model: model.name
        })
        throw error
      }
    }
  }
}
