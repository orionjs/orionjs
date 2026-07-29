import {configureEchoesRuntime} from '../runtime'
import {typedEchoesSchema} from '../schema'
import {createEchoRequest} from '.'

describe('standalone schema runtime', () => {
  it('cleans and validates params before resolving, then cleans the return', async () => {
    const calls: string[] = []
    const params = typedEchoesSchema<{count: number}>({
      clean(value: any) {
        calls.push('clean params')
        return {count: Number(value.count)}
      },
      validate(value: any) {
        calls.push('validate params')
        if (!Number.isFinite(value.count)) throw new Error('count must be a number')
      },
    })
    const returns = typedEchoesSchema<{result: string}>({
      clean(value: any) {
        calls.push('clean returns')
        return {result: String(value.result)}
      },
      validate() {
        calls.push('validate returns')
      },
    })
    const echo = createEchoRequest({
      params,
      returns,
      async resolve(value) {
        calls.push('resolve')
        expect(value).toEqual({count: 2})
        return {result: value.count as any}
      },
    })

    expect(await echo.resolve({count: '2'} as any)).toEqual({result: '2'})
    expect(calls).toEqual(['clean params', 'validate params', 'resolve', 'clean returns'])
  })

  it('does not call the resolver when validation fails', async () => {
    let resolved = false
    const params = typedEchoesSchema<{name: string}>({
      clean(value: any) {
        return value
      },
      validate() {
        throw new Error('invalid name')
      },
    })
    const echo = createEchoRequest({
      params,
      async resolve() {
        resolved = true
      },
    })

    await expect(echo.resolve({name: ''})).rejects.toThrow('invalid name')
    expect(resolved).toBe(false)
  })

  it('supports custom schema engines through the runtime adapter', async () => {
    const schema = {kind: 'custom'}
    const restore = configureEchoesRuntime({
      schema: {
        clean: (_schema, value: any) => ({value: String(value.value)}),
        parse: (_schema, value: any) => {
          const cleaned = {value: Number(value.value)}
          if (!Number.isFinite(cleaned.value)) throw new Error('invalid value')
          return cleaned
        },
      },
    })

    try {
      const echo = createEchoRequest({
        params: schema,
        returns: schema,
        async resolve(params: any) {
          return {value: params.value + 1}
        },
      })

      await expect(echo.resolve({value: '2'} as any)).resolves.toEqual({value: '3'})
    } finally {
      restore()
    }
  })
})
