import {component} from '@orion-js/components'
import echoes from './controllers/echoes'
import routes from './controllers/http'
import jobs from './controllers/jobs'
import modelResolvers from './controllers/modelResolvers'
import resolvers from './controllers/resolvers'

export default component({
  echoes,
  routes,
  jobs,
  modelResolvers,
  resolvers,
})
