import Controller from '../../controllers/Controller'
import mutationParams from './mutationParams'

export default new Controller({
  name: 'ExposeSchemaController',
  resolvers: {
    mutationParams
  }
})
