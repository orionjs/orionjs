import {Collection} from '@orion-js/mongodb'
import {User} from './user'

export interface GetSessionOpts {
  Users: Collection<User>
}
