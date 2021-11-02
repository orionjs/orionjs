import {resolver} from '@orion-js/resolvers'
import createModel from '.'

describe('Test init item', () => {
  // Tests if the resolvers are passed to the item
  it('Should pass the resolvers to the item', async () => {
    const Person = createModel({
      name: 'PersonModel',
      schema: {
        name: {type: String}
      },
      resolvers: {
        title: resolver({
          resolve: async (person, {title}) => {
            return `${title} ${person.name}`
          }
        })
      }
    })

    const doc = {name: 'Nico'}
    const person = Person.initItem(doc)
    expect(await person.title({title: 'Mr'})).toBe('Mr Nico')
  })
})
