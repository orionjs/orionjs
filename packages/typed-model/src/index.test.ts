import {createModel} from '@orion-js/models'
import {modelResolver} from '@orion-js/resolvers'
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {Prop, TypedSchema, getSchemaForClass, getModelForClass, resetModelCache} from './index'

afterEach(() => {
  resetModelCache()
})

describe('typed-schema e2e tests', () => {
  describe('getSchemaForClass', () => {
    it('works for a simple schema', () => {
      @TypedSchema()
      class Spec {
        @Prop({type: String, optional: true})
        name: string

        @Prop({type: Date, optional: true})
        createdAt: Date

        @Prop({type: Boolean, optional: true})
        isDeleted: boolean
      }

      const expected = {
        __modelName: 'Spec',
        name: {
          type: String,
          optional: true,
        },
        createdAt: {
          type: Date,
          optional: true,
        },
        isDeleted: {
          type: Boolean,
          optional: true,
        },
      }

      expect(getSchemaForClass(Spec)).toEqual(expected)
    })

    it('works for a simple schema using alt data types', () => {
      @TypedSchema()
      class Spec {
        @Prop({type: 'string'})
        name: string

        @Prop({type: 'ID'})
        _id: string

        @Prop({type: 'integer'})
        age: number

        @Prop({type: 'blackbox'})
        metadata: object
      }

      const expected = {
        __modelName: 'Spec',
        name: {
          type: 'string',
        },
        _id: {
          type: 'ID',
        },
        age: {
          type: 'integer',
        },
        metadata: {
          type: 'blackbox',
        },
      }

      expect(getSchemaForClass(Spec)).toEqual(expected)
    })

    it('works for multiple data types', () => {
      @TypedSchema()
      class Spec {
        @Prop({type: String})
        name: string

        @Prop({type: Number})
        age: number

        @Prop({type: Date})
        createdAt: Date

        @Prop({type: Boolean})
        isDeleted: boolean
      }
      const expected = {
        __modelName: 'Spec',
        name: {
          type: String,
        },
        age: {
          type: Number,
        },
        createdAt: {
          type: Date,
        },
        isDeleted: {
          type: Boolean,
        },
      }

      expect(getSchemaForClass(Spec)).toEqual(expected)
    })

    describe('when using object types', () => {
      it('works for object types', () => {
        @TypedSchema()
        class Spec {
          @Prop({
            type: {
              name: {type: String},
            },
          })
          user: {name: string}
        }
        const expected = {
          __modelName: 'Spec',
          user: {
            type: {
              name: {
                type: String,
              },
            },
          },
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })

      it('works for object types using shorthands', () => {
        @TypedSchema()
        class Spec {
          @Prop({
            type: {
              name: {
                type: 'string',
              },
            },
          })
          user: {name: string}
        }

        const expected = {
          __modelName: 'Spec',
          user: {
            type: {
              name: {
                type: 'string',
              },
            },
          },
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })
    })

    describe('when using array types', () => {
      it('works for array schemas', () => {
        @TypedSchema()
        class Spec {
          @Prop({type: [String]})
          names: string[]

          @Prop({type: [Number]})
          ages: number[]
        }

        const expected = {
          __modelName: 'Spec',
          names: {
            type: [String],
          },
          ages: {
            type: [Number],
          },
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })
    })

    describe('when using nested schemas', () => {
      it('works for nested schemas', () => {
        @TypedSchema()
        class A {
          @Prop({type: String})
          name: string
        }

        @TypedSchema()
        class B {
          @Prop({type: String})
          lastName: string
        }

        @TypedSchema()
        class Spec {
          @Prop({type: String})
          name: string

          @Prop({
            type: A,
          })
          a: A

          @Prop({
            type: B,
          })
          b: B
        }

        const expected = {
          __modelName: 'Spec',
          name: {
            type: String,
          },
          a: {
            type: {
              __modelName: 'A',
              name: {
                type: String,
              },
            },
          },
          b: {
            type: {
              __modelName: 'B',
              lastName: {
                type: String,
              },
            },
          },
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })

      it('works for nested schemas with objects inside', () => {
        @TypedSchema()
        class A {
          @Prop({
            type: {
              phoneNumber: {type: String},
            },
          })
          data: {phoneNumber: string}
        }

        @TypedSchema()
        class B {
          @Prop({type: A, optional: true})
          a: A
        }

        @TypedSchema()
        class Spec {
          @Prop({type: String})
          name: string

          @Prop({
            type: B,
          })
          b: B
        }

        const expected = {
          __modelName: 'Spec',
          name: {
            type: String,
          },
          b: {
            type: {
              __modelName: 'B',
              a: {
                optional: true,
                type: {
                  __modelName: 'A',
                  data: {
                    type: {
                      phoneNumber: {
                        type: String,
                      },
                    },
                  },
                },
              },
            },
          },
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })
    })
  })

  describe('getModelForClass', () => {
    it('works for flat classes', () => {
      @TypedSchema()
      class Spec2 {
        @Prop({optional: true, type: String})
        name: string
      }

      const expected = createModel({
        name: 'Spec',
        schema: {
          name: {
            type: String,
            optional: true,
          },
        },
      })

      expect(getModelForClass(Spec2).name).toEqual('Spec2')

      expect(omit(getModelForClass(Spec2).getSchema(), '__modelName')).toEqual(
        omit(expected.getSchema(), '__modelName'),
      )
    })

    it('works for nested models', () => {
      @TypedSchema()
      class A {
        @Prop({optional: true, type: String})
        name: string
      }

      const AModel = getModelForClass(A)
      @TypedSchema()
      class Spec {
        @Prop({type: AModel})
        a: A
      }

      const expected = createModel({
        name: 'Spec',
        schema: {
          a: {
            type: AModel,
          },
        },
      })

      console.log('expected', JSON.stringify(getModelForClass(Spec).getSchema(), null, 2))

      expect(getModelForClass(Spec).name).toEqual(expected.name)
      expect(getModelForClass(Spec).getSchema()).toEqual(expected.getSchema())
    })

    it('works for nested arrays of models', () => {
      @TypedSchema()
      class A {
        @Prop({optional: true, type: String})
        name: string
      }

      const AModel = getModelForClass(A)

      expect(AModel.getSchema()).toEqual({
        __modelName: 'A',
        name: {
          type: String,
          optional: true,
        },
      })

      @TypedSchema()
      class Spec {
        @Prop({type: [AModel]})
        a: A[]
      }

      const expectedSchema = {
        __modelName: 'Spec',
        a: {
          type: [
            {
              __modelName: 'A',
              name: {
                type: String,
                optional: true,
              },
            },
          ],
        },
      }

      expect(getModelForClass(Spec).name).toEqual('Spec')
      expect(getModelForClass(Spec).getSchema()).toEqual(expectedSchema)
    })

    it('works for nested models together with nested classes', () => {
      @TypedSchema()
      class NestedModelClass {
        @Prop({optional: true, type: 'string'})
        name: string
      }

      const dataType = {
        type: {firstName: {type: 'string'}, createdAt: {type: 'date'}},
      }
      @TypedSchema()
      class NestedClassClass {
        @Prop(dataType)
        data: {firstName: string; createdAt: Date}
      }

      expect(getModelForClass(NestedClassClass).getSchema()).toEqual({
        __modelName: 'NestedClassClass',
        data: dataType,
      })

      const NestedModel = getModelForClass(NestedModelClass)
      @TypedSchema()
      class Spec {
        @Prop({type: NestedModelClass})
        a: NestedModelClass

        @Prop({type: NestedClassClass})
        b: NestedClassClass
      }

      const expected = createModel({
        name: 'Spec',
        schema: {
          a: {
            type: NestedModel,
          },
          b: {
            type: {
              __modelName: 'NestedClassClass',
              data: dataType,
            },
          },
        },
      })

      expect(getModelForClass(Spec).name).toEqual(expected.name)
      expect(getModelForClass(Spec).getSchema()).toEqual(expected.getSchema())
    })

    it('Should return the same object when calling getModelForClass multiple times', () => {
      @TypedSchema()
      class Spec {
        @Prop({type: String})
        name: string
      }

      const model = getModelForClass(Spec)
      expect(getModelForClass(Spec)).toBe(model)
    })
  })

  describe('creating schemas', () => {
    it('allows creating multiple classes with the same name', () => {
      const create = () => {
        @TypedSchema()
        // eslint-disable-next-line no-unused-vars
        class Spec {
          @Prop({type: String})
          name: string
        }
      }

      create()
      create()
    })
  })

  describe('Typed model as arguments', () => {
    it('allows passing typed model as argument to resolvers', async () => {
      @TypedSchema()
      class ResolverParams {
        @Prop({type: String})
        firstName: string
      }

      @TypedSchema()
      class ResolverReturns {
        @Prop({type: String})
        fullName: string
      }

      console.log('will create model resolver')
      const fullName = modelResolver({
        params: ResolverParams,
        returns: ResolverReturns,
        async resolve(item: Person, params: ResolverParams): Promise<ResolverReturns> {
          return {fullName: `${params.firstName} ${item.lastName}`}
        },
      })

      @TypedSchema({
        resolvers: {
          fullName,
        },
      })
      class Person {
        @Prop({type: String})
        lastName: string
      }

      const model = getModelForClass(Person)
      console.log('model person', model.getSchema(), model.getResolvers())
    })
  })
})

function omit(arg0: any, arg1: string): any {
  return Object.fromEntries(Object.entries(arg0).filter(([key]) => key !== arg1))
}
