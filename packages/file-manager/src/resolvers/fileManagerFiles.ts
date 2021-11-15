import {paginatedResolver} from '@orion-js/paginated-mongodb'
import escape from 'escape-string-regexp'
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
    const query: any = {status: 'uploaded'}

    query.createdBy = viewer.userId

    if (filter) {
      query.name = {$regex: new RegExp(`^${escape(filter)}`)}
    }

    return Files.find(query)
  }
})
