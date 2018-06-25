import addCard from './addCard'
import deleteCard from './deleteCard'
import setDefaultCard from './setDefaultCard'

const defaultOptions = {}

export default function(passedOptions) {
  const options = {...defaultOptions, ...passedOptions}
  return {
    setDefaultCard: setDefaultCard(options),
    deleteCard: deleteCard(options),
    addCard: addCard(options)
  }
}
