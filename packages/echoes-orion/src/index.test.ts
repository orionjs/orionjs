import {Echoes, EchoRequest, getServiceEchoes, request, startService} from '@orion-js/echoes'
import {getOrionAsyncContext} from '@orion-js/logger'
import {ValidationError} from '@orion-js/schema'
import {Inject, Service} from '@orion-js/services'
import './index'

describe('Orion Echoes adapter', () => {
  it('preserves Orion schema cleaning, runtime validation, DI, and async context', async () => {
    @Service()
    class PrefixService {
      value = 'total'
    }

    @Echoes()
    class CalculatorEchoes {
      @Inject(() => PrefixService)
      prefix: PrefixService

      @EchoRequest({
        params: {
          name: {
            type: String,
            min: 1,
          },
        },
        returns: {
          label: {
            type: String,
          },
        },
      })
      async calculate(params: {name: string}) {
        const context = getOrionAsyncContext()
        expect(context?.controllerType).toBe('echo')
        expect(context?.echoName).toBe('calculate')
        return {label: `${this.prefix.value}:${params.name}`}
      }
    }

    const echo = getServiceEchoes(CalculatorEchoes).calculate
    const result = await echo.resolve({name: '  two  '})
    expect(result).toEqual({
      label: 'total:two',
    })
    await expect(echo.resolve({name: ''})).rejects.toMatchObject({
      isValidationError: true,
    })
  })

  it('reconstructs Orion errors received over the standalone request protocol', async () => {
    await startService({
      echoes: {},
      requests: {
        key: 'secret',
        services: {
          users: 'http://unused.test',
        },
        registerHandler() {},
        async makeRequest() {
          return {
            statusCode: 200,
            data: {
              error: 'Validation Error',
              isValidationError: true,
              errorInfo: {
                error: 'validationError',
                message: 'Validation Error',
                validationErrors: {email: 'required'},
                labels: {email: 'Email'},
              },
            },
          }
        },
      },
    })

    const promise = request({
      service: 'users',
      method: 'find',
      params: {},
    })
    await expect(promise).rejects.toBeInstanceOf(ValidationError)
    await expect(promise).rejects.toMatchObject({
      validationErrors: {email: 'required'},
      labels: {email: 'Email'},
    })
  })
})
