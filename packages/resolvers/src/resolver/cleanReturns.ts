import clone from 'lodash/clone'

export default function (rawReturns) {
  if (!rawReturns) return

  // for typed model
  if (rawReturns.getModel) {
    return rawReturns.getModel()
  }

  return rawReturns
}
