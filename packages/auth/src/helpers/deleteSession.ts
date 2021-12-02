export default async function ({userId, Sessions, sessionId}) {
  await Sessions.deleteMany({_id: sessionId, userId})
}
