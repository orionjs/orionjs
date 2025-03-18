export const getFileName = () => {
  try {
    const stack = new Error().stack
    const lines = stack.split('\n')
    const filePath = lines[3].split('(')[1].split(')')[0]
    return improveFileName(filePath)
  } catch {
    return
  }
}

export const improveFileName = (path: string) => {
  path = path.replace(`${process.cwd()}/`, '')
  if (path.includes('orionjs/packages')) {
    return path.replace(/^.+\/orionjs\/packages\//, '@orion-js/')
  }

  if (path.includes('node_modules/@orion-js/')) {
    const after = path.split('node_modules/@orion-js/')[1]
    const onlyPackageName = after.split('/')[0]
    return `@orion-js/${onlyPackageName}`
  }

  if (path.includes('.orion/build')) {
    return path.replace(/^.+\.orion\/build\//, '')
  }
  if (path.includes('.pnpm/@orion-js+')) {
    return `@orion-js/${path.split('.pnpm/@orion-js+')[1].split('@')[0]}`
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
