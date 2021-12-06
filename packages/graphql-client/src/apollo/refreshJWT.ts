export default async function (options) {
  const currentJWT = options.getJWT()
  const oldSession = options.getSession() || {}
  if (!currentJWT && oldSession.userId) {
    return await options.upgradeJWT()
  } else {
    return await options.refreshJWT()
  }
}
