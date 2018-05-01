import {Collection} from '@orion-js/app'
import Session from './Model'

export default options =>
  new Collection({
    name: 'sessions',
    model: Session(options),
    indexes: [{keys: {userId: 1}}, {keys: {publicKey: 1}, options: {unique: true}}]
  })
