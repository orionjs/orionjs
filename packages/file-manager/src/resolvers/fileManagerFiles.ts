import {createPaginatedResolver} from '@orion-js/paginated-mongodb'
import escapeString from 'escape-string-regexp'
import {Files} from '../Files'
import {FileSchema} from '../File/schema'

const fileManagerFiles = createPaginatedResolver({
  params: {
    filter: {
      type: String,
      optional: true,
    },
  },
  returns: FileSchema as any,
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
