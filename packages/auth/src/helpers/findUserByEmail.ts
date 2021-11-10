export default async function({Users, email}) {
  if (!email) return null
  email = email.toLowerCase()

  return await Users.findOne({'emails.address': email})
}
