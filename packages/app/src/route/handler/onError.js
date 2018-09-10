export default function({error, send, response}) {
  if (error.isOrionError) {
    const statusCode = 400
    const data = error.getInfo()
    send(response, statusCode, data)
  } else if (error.isGraphQLError) {
    send(response, error.statusCode, error.message)
  } else {
    const statusCode = 500
    const data = {error: 500, message: 'Internal server error'}

    console.error(error)
    send(response, statusCode, data)
  }
}
