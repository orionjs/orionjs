import {paginatedResolver} from '@orion-js/app'
import File from '../File'
import Files from '../Files'

export default paginatedResolver({
  params: {
    filter: {
      type: String,
      optional: true
    }
  },
  returns: File,
  async getCursor({filter}, viewer) {
    const query = {status: 'uploaded'}

    query.createdBy = viewer.userId

    if (filter) {
      query.name = filter
    }

    return Files.find(query)
  }
})
