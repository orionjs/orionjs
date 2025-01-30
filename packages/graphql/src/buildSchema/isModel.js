import {Model} from '@orion-js/app'

export default function (object) {
  return object instanceof Model || object.__isModel
}
