import {component} from '.'

describe('Components', () => {
  it('should force the correct type of component', () => {
    class ExampleEchoes {}

    component({
      echoes: [ExampleEchoes]
    })
  })
})
