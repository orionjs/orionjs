import {getOptions} from '../options'

export default async function (session, resetStore = true) {
  const {apolloClient, saveSession, wsClient} = getOptions()

  if (resetStore) {
    await apolloClient.clearStore()
  }

  await saveSession(session)

  if (resetStore) {
    await apolloClient.reFetchObservableQueries()
  }

  if (wsClient) {
    // @ts-ignore TODO: Remove this
    wsClient.tryReconnect()
  }
}
