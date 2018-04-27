export default function({name, params, returns, mutation, private: isPrivate, resolve}) {
  return {name, params, returns, mutation, private: isPrivate, resolve}
}
