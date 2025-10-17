import {format, Logform} from 'winston'
import {getOrionAsyncContext} from '../asyncContext'

export const enrichWithAsyncContext: Logform.FormatWrap = format(info => {
  const asyncContext = getOrionAsyncContext()
  if (!asyncContext) return info

  const contextData: any = {
    controllerType: asyncContext.controllerType,
    contextId: asyncContext.contextId,
  }

  // Add controller-specific fields
  switch (asyncContext.controllerType) {
    case 'job':
      contextData.jobName = asyncContext.jobName
      break
    case 'route':
      contextData.routeName = asyncContext.routeName
      contextData.pathname = asyncContext.pathname
      break
    case 'resolver':
      if (asyncContext.resolverName) {
        contextData.resolverName = asyncContext.resolverName
      }
      break
    case 'modelResolver':
      if (asyncContext.modelName) {
        contextData.modelName = asyncContext.modelName
      }
      if (asyncContext.modelResolverName) {
        contextData.modelResolverName = asyncContext.modelResolverName
      }
      break
    case 'subscription':
      contextData.subscriptionName = asyncContext.subscriptionName
      break
    case 'echo':
      contextData.echoName = asyncContext.echoName
      break
  }

  // Extract userId from viewer if available
  if (asyncContext.viewer && typeof asyncContext.viewer === 'object') {
    const viewer = asyncContext.viewer as any
    if (viewer.userId) {
      contextData.userId = viewer.userId
    } else if (viewer._id) {
      contextData.userId = viewer._id
    } else if (viewer.id) {
      contextData.userId = viewer.id
    }
  }

  info.asyncContext = contextData

  return info
})
