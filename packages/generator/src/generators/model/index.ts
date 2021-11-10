import fs from 'fs'
import writeFile from '../../helpers/writeFile'
import templates from './templates'
import schema from './templates/schema'
import resolvers from './templates/resolvers'
import importIndex from '../../helpers/importIndex'
import {GeneratorOptions, GeneratorResources} from '../../types'

export default async function <Legacy>({
  name,
  path,
  legacy
}: GeneratorOptions<GeneratorResources.MODEL, Legacy>): Promise<void> {
  const ext = legacy ? '.js' : '.ts'

  name = name.replace(ext, '')

  const content = templates['model']({name, legacy})

  const basePath = `${path}/${name}`
  const finalPath = `${basePath}/index${ext}`
  const schemaPath = `${basePath}/schema${ext}`
  const resolverPath = legacy
    ? `${basePath}/resolvers/index${ext}`
    : `${basePath}/exampleResolver/index${ext}`

  if (fs.existsSync(finalPath)) {
    throw new Error('ya existe un archivo en ' + finalPath)
  }
  if (legacy && fs.existsSync(schemaPath)) {
    throw new Error('ya existe un archivo en ' + schemaPath)
  }
  if (fs.existsSync(resolverPath)) {
    throw new Error('ya existe un archivo en ' + resolverPath)
  }

  await writeFile(finalPath, content)

  if (legacy) {
    const schemaContent = schema()

    await writeFile(schemaPath, schemaContent)
  }

  const resolverContent = resolvers({legacy})

  await writeFile(resolverPath, resolverContent)

  if (legacy) await importIndex(path, name)

  console.log(`Modelo creado correctamente.`)
}
