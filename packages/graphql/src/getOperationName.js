export default async function getOperationName(params) {
  const {request, getBodyJSON} = params
  try {
    if (request.method !== 'GET') {
      const data = await getBodyJSON()
      return data.operationName
    }

    if (request.method === 'GET') {
      // handle persisted queries
      const queryParams = new URLSearchParams(request.url.split('?')[1])
      return queryParams.get('operationName')
    }
  } catch (error) {
    return null
  }
}
