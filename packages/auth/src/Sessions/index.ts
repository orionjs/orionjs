import {TypedModel, Prop, ResolverProp} from '@orion-js/typed-model'
import {createCollection} from '@orion-js/mongodb'
import Session, {AbstractSession} from './Model'

export default options =>
  createCollection<AbstractSession>({
    name: 'sessions',
    model: Session(options),
    indexes: [{keys: {userId: 1}}, {keys: {publicKey: 1}, options: {unique: true}}]
  })
