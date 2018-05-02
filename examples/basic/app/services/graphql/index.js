import {startGraphQL, setCorsOptions} from '@orion-js/app'
import controllers from 'app/controllers'

startGraphQL({controllers})

setCorsOptions({
  origin: '*'
})
