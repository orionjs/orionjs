import {getOptions} from '../options'

export default function() {
  const {getSession} = getOptions()

  return getSession()
}
