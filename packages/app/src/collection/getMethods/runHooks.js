import resolveParam from '../../Model/resolveParam'

export default async function(collection, type, ...args) {
  collection.hooks = resolveParam(collection.hooks)

  const info = {
    collection,
    action: type
  }

  const hooks = collection.hooks.filter(hook => hook.type === type)
  for (const hook of hooks) {
    await hook.func.apply(info, args)
  }
}
