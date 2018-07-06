import {getOptions} from '../options'

export default async function(session) {
  const {apolloClient, saveSession} = getOptions()

  await saveSession(session)

  await apolloClient.resetStore()
}
