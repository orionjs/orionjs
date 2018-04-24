import {route} from '@orion-js/app'

export default route('/create', function({query}) {
  console.log(query)
  return query
})
