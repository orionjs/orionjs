export default async function(collection, type, ...args) {
  const hooks = collection.hooks.filter(hook => hook.type === type)
  for (const hook of hooks) {
    await hook.func(...args)
  }
}
