import getArgs from './getArgs'
import checkPermissions from './checkPermissions'
import cleanAndValidate from './cleanAndValidate'
import initResult from './initResult'
import getResult from './getResult'

export default function(options) {
  const {
    cache,
    resolverId,
    params,
    returns,
    resolve,
    requireUserId,
    roles,
    checkPermission
  } = options
  return async function(...args) {
    let {parent, callParams, viewer} = getArgs(...args)

    callParams = await cleanAndValidate({params, callParams, viewer})

    await checkPermissions({parent, callParams, viewer, requireUserId, roles, checkPermission})

    let result = await getResult({
      cache,
      resolverId,
      parent,
      callParams,
      viewer,
      resolve
    })

    result = initResult({result, returns})

    return result
  }
}
