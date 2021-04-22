import {getOptions} from '../options'

export default function () {
  const {getJWT} = getOptions()

  return getJWT()
}
