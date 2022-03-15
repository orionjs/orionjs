export const getFileName = () => {
  try {
    const stack = new Error().stack
    const lines = stack.split('\n')
    const filePath = lines[4].split('(')[1].split(')')[0]
    return improveFileName(filePath)
  } catch (error) {
    return
  }
}

export const improveFileName = (path: string) => {
  if (path.includes('orionjs/packages')) {
    return path.replace(/^.+\/orionjs\/packages\//, '@orion-js/')
  }

  if (path.includes('.orion/build')) {
    return path.replace(/^.+\.orion\/build\//, '')
  }

  if (path.includes('/node_modules/@')) {
    const after = path.split('/node_modules/')[1]
    const parts = after.split('/')
    return `${parts[0]}/${parts[1]}`
  }

  if (path.includes('/node_modules/')) {
    const after = path.split('/node_modules/')[1]
    const parts = after.split('/')
    return `${parts[0]}`
  }

  return path
}

export const setFileName = (metadata: any) => {
  if (metadata.fileName) return
  metadata.fileName = getFileName()
}
