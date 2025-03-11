import {component} from '.'
import {describe, it} from 'vitest'

describe('Components', () => {
  it('should force the correct type of component', () => {
    class ExampleEchoes {}

    component({
      echoes: [ExampleEchoes],
    })
  })
})
