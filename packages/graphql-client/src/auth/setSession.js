import {getOptions} from '../options'

export default async function (session, resetStore = true) {
  const {apolloClient, saveSession, wsClient} = getOptions()

  await saveSession(session)

  if (resetStore) {
    await apolloClient.resetStore()
  }

  if (wsClient) {
    wsClient.tryReconnect()
  }
}
