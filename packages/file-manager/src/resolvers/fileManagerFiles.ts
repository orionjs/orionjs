import {paginatedResolver} from '@orion-js/paginated-mongodb'
import {Resolver} from '@orion-js/resolvers'
import escapeString from 'escape-string-regexp'
import {Files} from '../Files'
import {FileSchema} from '../File/schema'

const fileManagerFiles: Resolver = paginatedResolver({
  params: {
    filter: {
      type: String,
      optional: true,
    },
  },
  returns: FileSchema,
  async getCursor({filter}, viewer) {
    const query: any = {status: 'uploaded'}

    query.createdBy = viewer.userId

    if (filter) {
      query.name = {$regex: new RegExp(`^${escapeString(filter)}`)}
    }

    return Files.find(query)
  },
})

export default fileManagerFiles
