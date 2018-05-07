import validateModifier from './index'
import {validate} from '@orion-js/schema'
import omit from 'lodash/omit'
import fromDot from '../../../database/dot/fromDot'

const getPushSimulation = function($push) {
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

const simulateNewDoc = function(selector, modifier) {
  return fromDot({
    ...selector,
    ...modifier.$set,
    ...modifier.$inc,
    ...getPushSimulation(modifier.$push),
    ...getPushSimulation(modifier.$addToSet),
    ...modifier.$setOnInsert
  })
}

const validateNewDoc = async function(schema, selector, modifier) {
  const doc = simulateNewDoc(selector, modifier)
  await validate(schema, doc)
}

export default async function(schema, selector, modifier) {
  await validateNewDoc(schema, selector, modifier)
  await validateModifier(schema, omit(modifier, '$setOnInsert'))
}
