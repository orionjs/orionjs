let credentials = {}

export const setupFileManager = options => (credentials = options)

export const getAWSCredentials = () => credentials
