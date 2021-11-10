export interface UserEmail {
  address: string
  verified: boolean
}

export interface User {
  emails: [UserEmail]
  services: any
  profile: any
  createdAt: Date
}
