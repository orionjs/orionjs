import resolver from './resolver'
export * from './resolver/types'
import checkPermissions from './resolver/getExecute/checkPermissions'
import {addPermissionChecker} from './resolver/permisionsCheckers'

export {resolver, checkPermissions, addPermissionChecker}
