import bcrypt from 'bcryptjs'

export default function(user, password) {
  if (!user.services || !user.services.password || !user.services.password.bcrypt) return false
  return bcrypt.compareSync(password, user.services.password.bcrypt)
}
