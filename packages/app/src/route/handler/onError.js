export default function({error, send, response}) {
  if (error.isOrionError) {
    let statusCode = 400
    if (error.code === 'AuthError') {
      statusCode = 401
    }
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
