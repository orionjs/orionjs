import resolveParam from '../../Model/resolveParam'

export default async function(collection, type, ...args) {
  collection.hooks = resolveParam(collection.hooks)

  const hooks = collection.hooks.filter(hook => hook.type === type)
  for (const hook of hooks) {
    await hook.func(...args)
  }
}
