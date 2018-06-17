import {startGraphQL, setCorsOptions} from '@orion-js/app'
import resolvers from 'app/resolvers'

startGraphQL({
  resolvers
})

setCorsOptions({
  origin: '*'
})
