import {getOptions} from '../options'

export default async function(session) {
  const {apolloClient, saveSession, wsClient} = getOptions()

  await saveSession(session)

  await apolloClient.resetStore()

  if (wsClient) {
    wsClient.tryReconnect()
  }
}
