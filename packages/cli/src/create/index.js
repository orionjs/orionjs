import execute from '../helpers/execute'

export default async function({name, kit}) {
  if (!name) {
    throw new Error('Please set the name of the app')
  }
  if (!kit) {
    throw new Error('Please select which kit to use')
  }
  const repo = `https://github.com/orionjs/boilerplate-${kit}`
  console.log('Downloading starter kit...')
  await execute(`git clone ${repo} ${name}`)
  await execute(`cd ${name} && rm -rf .git`)
  console.log('Your starter kit is ready')
  await execute(`cd ${name} && rm -rf README.md`)
}
