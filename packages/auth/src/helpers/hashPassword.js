import bcrypt from 'bcryptjs'

const saltRounds = 12

export default function(password) {
  return bcrypt.hashSync(password, saltRounds)
}
