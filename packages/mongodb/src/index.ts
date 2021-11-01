import {connections} from './connect/connections'
import {connectToDB} from './connect/connectToDB'
import {connect} from './connect'
import createCollection from './createCollection'
import * as TypedModel from '@orion-js/typed-model'

export {connect, connectToDB, connections, createCollection, TypedModel}

export * from './types'
