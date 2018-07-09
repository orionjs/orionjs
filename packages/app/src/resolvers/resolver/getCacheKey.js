import hashObject from '../../helpers/hashObject'

export default function({parent, callParams, resolverId}) {
  const key = hashObject({parent, callParams, resolverId})
  return key
}
