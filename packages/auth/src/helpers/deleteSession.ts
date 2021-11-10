export default async function({userId, Sessions, sessionId}) {
  await Sessions.remove({_id: sessionId, userId})
}
