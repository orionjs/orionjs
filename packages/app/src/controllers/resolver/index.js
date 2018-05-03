import checkArgs from './checkArgs'
export default function({name, params, returns, mutation, private: isPrivate, resolve}) {
  return {
    name,
    params,
    returns,
    mutation,
    private: isPrivate,
    resolve: async (...args) => {
      if (params) {
        await checkArgs(params, ...args)
      }

      return await resolve(...args)
    }
  }
}
