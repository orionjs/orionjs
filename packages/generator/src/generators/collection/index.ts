import fs from 'fs'
import writeFile from '../../helpers/writeFile'
import {GeneratorOptions, GeneratorResources} from '../../types'
import templates from './templates'

export default async function <Legacy>({
  name,
  path,
  legacy
}: GeneratorOptions<GeneratorResources.COLLECTION, Legacy>): Promise<void> {
  const ext = legacy ? '.js' : '.ts'

  name = name.replace(ext, '')

  const basePath = `${path}/${name}`
  const finalPath = `${basePath}/index${ext}`

  const content = templates['collection']({name, legacy})

  if (fs.existsSync(basePath)) {
    throw new Error('ya existe este directorio en ' + basePath)
  }

  if (fs.existsSync(finalPath)) {
    throw new Error('ya existe un archivo en ' + finalPath)
  }

  await writeFile(finalPath, content)

  console.log(`Collection creada correctamente.`)
}
