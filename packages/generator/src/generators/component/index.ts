import fs from 'fs'
import {job, resolver, model, collection} from '../../generators'
import writeFile from '../../helpers/writeFile'
import templates from './templates'
import importIndex from '../../helpers/importIndex'
import {GeneratorOptions, GeneratorResources} from '../../types'
import {capitalize} from '../../helpers/capitalize'

const directories = ['collections', 'models', 'resolvers', 'jobs']

export default async function <Legacy>({
  name,
  path,
  legacy
}: GeneratorOptions<GeneratorResources.COMPONENT, Legacy>): Promise<void> {
  const ext = legacy ? '.js' : '.ts'

  name = name.replace(ext, '')

  const basePath = `${path}/${capitalize(name)}`

  if (fs.existsSync(basePath)) {
    throw new Error('ya existe este directorio en ' + basePath)
  }

  if (legacy) {
    for (const dir of directories) {
      const newPath = `${basePath}/${dir}`
      fs.mkdirSync(newPath, {recursive: true})
    }

    const content = templates['resolver']({})

    await writeFile(`${basePath}/resolvers/index.js`, content)
    await writeFile(`${basePath}/jobs/index.js`, content)
    await importIndex(path, name)
  } else {
    await job<false>({
      name: 'exampleRecurrent',
      path: `${basePath}/jobs/`,
      legacy,
      type: 'recurrent'
    })
    await job<false>({
      name: 'exampleSingle',
      path: `${basePath}/jobs/`,
      legacy,
      type: 'single'
    })
    await collection<false>({name: 'Example', path: `${basePath}/collections/`, legacy})
    await model<false>({name: 'Example', path: `${basePath}/models/`, legacy})
    await resolver<false>({
      name: 'exampleMutationResolver',
      path: `${basePath}/resolvers/`,
      type: 'mutation',
      legacy
    })
    await resolver<false>({
      name: 'exampleResolver',
      path: `${basePath}/resolvers/`,
      type: 'query',
      legacy
    })
  }
  console.log(`Componente creado correctamente.`)
}
