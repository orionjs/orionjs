import getDataLoad from './dataLoad'
import loadById from './loadById'
import loadMany from './loadMany'
import loadOne from './loadOne'

export default function (info) {
  const dataLoad = getDataLoad(info)

  return {
    dataLoad,
    loadById: loadById(dataLoad, info),
    loadOne: loadOne(dataLoad, info),
    loadMany: loadMany(dataLoad, info)
  }
}
