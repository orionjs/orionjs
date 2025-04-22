import getUserCollection from "./getUserCollection"

export default async function ({ Users, email }) {
  if (!email) return null
  email = email.toLowerCase()

  return await getUserCollection(Users).findOne({
    $or: [{ 'emails.address': email }, { 'accountEmail.enc_address': email }],
  })
}
