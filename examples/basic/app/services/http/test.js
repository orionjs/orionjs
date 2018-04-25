import {route, validate} from '@orion-js/app'

export default route('/test', async function({query}) {
  const doc = {
    ...query,
    app: {
      name: query.name,
      tags: ['hi', 1, new Date()]
    }
  }
  await validate(
    {
      title: {
        type: String
      },
      name: {
        type: String,
        optional: true
      },
      app: {
        type: {
          name: {
            type: String
          },
          tags: {
            type: [String]
          }
        }
      }
    },
    doc
  )
  return 'ok'
})
