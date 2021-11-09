import fs from 'fs'
import writeFile from '../../helpers/writeFile'
import templates from './templates'
import importIndex from '../../helpers/importIndex'
import {GeneratorOptions, GeneratorResources} from '../../types'

export default async function <Legacy>({
  name,
  type,
  path,
  legacy
}: GeneratorOptions<GeneratorResources.RESOLVER, Legacy>): Promise<void> {
  if (!type || !['query', 'mutation', 'paginated'].includes(type)) {
    throw new Error('Este recurso requiere la opción type <query|mutation|paginated>')
  }

  const ext = legacy ? '.js' : '.ts'

  name = name.replace(ext, '')

  const content = templates[type]({legacy})
  const finalPath = `${path}/${name}/index${ext}`
  if (fs.existsSync(finalPath)) {
    throw new Error('ya existe un archivo en ' + finalPath)
  }
  await writeFile(finalPath, content)

  await importIndex(path, name)
  console.log(`Resolver de tipo ${type} creado correctamente.`)
}
