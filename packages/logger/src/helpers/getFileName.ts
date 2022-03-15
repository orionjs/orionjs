export const getFileName = () => {
  const stack = new Error().stack
  const lines = stack.split('\n')
  const filePath = lines[4].split('(')[1].split(')')[0]
  return improveFileName(filePath)
}

export const improveFileName = (path: string) => {
  if (path.includes('orionjs/packages')) {
    return path.replace(/^.+\/orionjs\/packages\//, '@orion-js/')
  }

  return path
}

export const setFileName = (metadata: any) => {
  if (metadata.fileName) return
  metadata.fileName = getFileName()
}
