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
}: GeneratorOptions<GeneratorResources.JOB, Legacy>): Promise<void> {
  const ext = legacy ? '.js' : '.ts'

  name = name.replace(ext, '')

  if (!type || !['event', 'recurrent', 'single'].includes(type)) {
    throw new Error('Este recurso requiere la opción type <event|recurrent|legacy>')
  }

  const content = templates[type]({legacy})

  const finalPath = `${path}/${name}/index${ext}`
  if (fs.existsSync(finalPath)) {
    throw new Error('ya existe un archivo en ' + finalPath)
  }
  await writeFile(finalPath, content)
  await importIndex(path, name)
  console.log('Job creado correctamente.')
}
