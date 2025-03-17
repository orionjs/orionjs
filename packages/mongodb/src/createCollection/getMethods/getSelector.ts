import {type} from 'rambdax'
import {Filter} from 'mongodb'
import {ModelClassBase, ModelToMongoSelector} from '../../types'

export default function getSelector<ModelClass extends ModelClassBase>(
  args: IArguments | any[],
): Filter<ModelClass> {
  if (args.length === 0) return {}

  const selector = args[0] as ModelToMongoSelector<ModelClass>

  if (typeof selector === 'string') {
    return {_id: selector} as Filter<ModelClass>
  }

  if (type(selector) === 'Object') {
    return selector as Filter<ModelClass>
  }

  return {
    _id: 'shouldReturnNull',
  } as Filter<ModelClass>
}
