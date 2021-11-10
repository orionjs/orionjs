import pathLib from 'path'
import {job, resolver, model, collection, component} from './generators'
import {GeneratorOptions, GeneratorResources} from './types'

const generators = {job, resolver, model, collection, component}

async function generator<Resource, Legacy>(
  resource: Resource,
  options: GeneratorOptions<Resource, Legacy>
): Promise<void> {
  if (typeof resource !== 'string') {
    throw new Error('Debe indicar el tipo de recurso')
  }

  if (!['resolver', 'component', 'model', 'collection', 'job'].includes(resource)) {
    throw new Error('Debe especificar un recurso valido: <resolver|component|model|collection|job>')
  }

  const {name, path = ''} = options

  if (!name || typeof name !== 'string') {
    throw new Error('Debe indicar un nombre para el recurso')
  }

  options.path = options.path && pathLib.isAbsolute(path) ? path : pathLib.join(process.cwd(), path)

  return generators[<string>resource](options)
}

function hola() {
  const re = generator<GeneratorResources.JOB, true>(GeneratorResources.JOB, {
    name: 'hola',
    type: 'event'
  })
}

export {generator}
