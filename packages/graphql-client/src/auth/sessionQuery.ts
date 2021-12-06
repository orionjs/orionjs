import gql from 'graphql-tag'

export default gql`
  query getLocalSession {
    orionjsSession @client {
      _id
      publicKey
      secretKey
      createdAt
      userId
      locale
      roles
      emailVerified
      __typename
    }
  }
`
