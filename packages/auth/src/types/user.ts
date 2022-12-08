export interface UserEmail {
  address: string
  verified: boolean
}

export interface User {
  _id: string
  emails: [UserEmail]
  services: any
  profile: any
  createdAt: Date
  email?: () => string
}
