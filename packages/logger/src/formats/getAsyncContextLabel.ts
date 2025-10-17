import {getOrionAsyncContext} from '../asyncContext'

export function getAsyncContextLabel(): string {
  const asyncContext = getOrionAsyncContext()
  if (!asyncContext) return ''

  const {controllerType} = asyncContext

  switch (controllerType) {
    case 'job':
      return `${controllerType}:${asyncContext.jobName}`
    case 'route':
      return `${controllerType}:${asyncContext.pathname}`
    case 'resolver':
      return asyncContext.resolverName
        ? `${controllerType}:${asyncContext.resolverName}`
        : controllerType
    case 'modelResolver':
      return asyncContext.modelResolverName
        ? `${controllerType}:${asyncContext.modelName}:${asyncContext.modelResolverName}`
        : controllerType
    case 'subscription':
      return `${controllerType}:${asyncContext.subscriptionName}`
    case 'echo':
      return `${controllerType}:${asyncContext.echoName}`
    default:
      return controllerType
  }
}
