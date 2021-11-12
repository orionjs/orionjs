export default function (rawReturns: any) {
  if (!rawReturns) return

  // for typed model
  if (rawReturns.getModel) {
    return rawReturns.getModel()
  }

  return rawReturns
}
