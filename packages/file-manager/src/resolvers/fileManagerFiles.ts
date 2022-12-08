import {paginatedResolver} from '@orion-js/paginated-mongodb'
import {Resolver} from '@orion-js/resolvers'
import escape from 'escape-string-regexp'
import File from '../File'
import Files from '../Files'

const fileManagerFiles: Resolver = paginatedResolver({
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

export default fileManagerFiles
