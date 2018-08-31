import recursiveClean from './recursiveClean'

const defaultOptions = {
  autoConvert: true,
  filter: true,
  trimStrings: true,
  removeEmptyStrings: true
}

export default async function(schema, doc = {}, passedOptions = {}, ...args) {
  const options = {...defaultOptions, ...passedOptions}
  const params = {
    schema: {type: schema},
    value: doc,
    doc,
    currentDoc: doc,
    options,
    args
  }
  return await recursiveClean(params)
}
