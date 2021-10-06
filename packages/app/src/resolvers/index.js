import resolver from './resolver'
import crudResolvers from './crudResolvers'
import paginatedResolver from './paginatedResolver'
import {addPermissionChecker} from './resolver/permisionsCheckers'
import tokenPaginatedResolver from './tokenPaginatedResolver'

export {resolver, crudResolvers, paginatedResolver, addPermissionChecker, tokenPaginatedResolver}
