import Controller from '../../controllers/Controller'
import params from './params'

export default new Controller({
  name: 'ExposeSchemaController',
  resolvers: {
    params
  }
})
