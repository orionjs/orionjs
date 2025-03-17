import validateModifier from './index'
import {validate} from '@orion-js/schema'
import {omit} from 'rambdax'
import fromDot from '../../../helpers/fromDot'

const getPushSimulation = $push => {
  if (!$push) return {}
  const simulation = {}
  for (const key of Object.keys($push)) {
    const value = $push[key]
    if (typeof value === 'object' && '$each' in value) {
      simulation[key] = value.$each
    } else {
      simulation[key] = [value]
    }
  }
  return simulation
}

const simulateNewDoc = (selector, modifier) =>
  fromDot({
    ...selector,
    ...modifier.$set,
    ...modifier.$inc,
    ...getPushSimulation(modifier.$push),
    ...getPushSimulation(modifier.$addToSet),
    ...modifier.$setOnInsert,
  })

const validateNewDoc = async (schema, selector, modifier) => {
  const doc = simulateNewDoc(selector, modifier)
  await validate(schema, doc)
}

export default async function (schema, selector, modifier) {
  await validateNewDoc(schema, selector, modifier)
  await validateModifier(schema, omit(['$setOnInsert'], modifier))
}
