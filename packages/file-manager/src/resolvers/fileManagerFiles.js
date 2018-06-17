import {createPaginatedResolver} from '@orion-js/app'
import File from '../File'
import Files from '../Files'

export default createPaginatedResolver({
  params: {
    filter: {
      type: String,
      optional: true
    }
  },
  returns: File,
  async getCursor({filter}, viewer) {
    console.log(filter)
    const query = {}

    query.createdBy = viewer.userId

    if (filter) {
      query.name = filter
    }

    return Files.find(query)
  }
})
