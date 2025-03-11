import {createModel} from '@orion-js/models'
import {modelResolver} from '@orion-js/resolvers'
import {describe, it, expect} from 'vitest'
import {CannotDetermineTypeError, CannotUseArrayError} from './errors'
import {Prop, TypedModel, getSchemaForClass, getModelForClass, ResolverProp} from './index'

describe('typed-schema e2e tests', () => {
  describe('getSchemaForClass', () => {
    it('works for a simple schema', () => {
      @TypedModel()
      class Spec {
        @Prop({type: String, optional: true})
        name: string

        @Prop({type: Date, optional: true})
        createdAt: Date

        @Prop({type: Boolean, optional: true})
        isDeleted: boolean
      }

      const expected = {
        name: {
          type: String,
          optional: true
        },
        createdAt: {
          type: Date,
          optional: true
        },
        isDeleted: {
          type: Boolean,
          optional: true
        }
      }

      expect(getSchemaForClass(Spec)).toEqual(expected)
    })

    it('works for a simple schema using alt data types', () => {
      @TypedModel()
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
        name: {
          type: 'string'
        },
        _id: {
          type: 'ID'
        },
        age: {
          type: 'integer'
        },
        metadata: {
          type: 'blackbox'
        }
      }

      expect(getSchemaForClass(Spec)).toEqual(expected)
    })

    it('works for a derived schema', () => {
      @TypedModel()
      class A {
        @Prop({type: String})
        name: string
      }

      class B extends A {
        @Prop({type: String})
        lastName: string
      }

      const expected = {
        name: {
          type: String
        },
        lastName: {
          type: String
        }
      }

      expect(getSchemaForClass(B)).toEqual(expected)
    })

    it('works for multiple data types', () => {
      @TypedModel()
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
        name: {
          type: String
        },
        age: {
          type: Number
        },
        createdAt: {
          type: Date
        },
        isDeleted: {
          type: Boolean
        }
      }

      expect(getSchemaForClass(Spec)).toEqual(expected)
    })

    describe('when using object types', () => {
      it('works for object types', () => {
        @TypedModel()
        class Spec {
          @Prop({
            type: {
              name: {type: String}
            }
          })
          user: {name: string}
        }
        const expected = {
          user: {
            type: {
              name: {
                type: String
              }
            }
          }
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })

      it('works for object types using shorthands', () => {
        @TypedModel()
        class Spec {
          @Prop({
            type: {
              name: String
            }
          })
          user: {name: string}
        }
        const expected = {
          user: {
            type: {
              name: {
                type: String
              }
            }
          }
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })
    })

    describe('when using array types', () => {
      it('works for array schemas', () => {
        @TypedModel()
        class Spec {
          @Prop({type: [String]})
          names: string[]

          @Prop({type: [Number]})
          ages: number[]
        }

        const expected = {
          names: {
            type: [String]
          },
          ages: {
            type: [Number]
          }
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })
    })

    describe('when using nested schemas', () => {
      it('works for nested schemas', () => {
        @TypedModel()
        class A {
          @Prop({type: String})
          name: string
        }

        @TypedModel()
        class B {
          @Prop({type: String})
          lastName: string
        }

        @TypedModel()
        class Spec {
          @Prop({type: String})
          name: string

          @Prop({
            type: A
          })
          a: A

          @Prop({
            type: B
          })
          b: B
        }

        const expected = {
          name: {
            type: String
          },
          a: {
            type: {
              name: {
                type: String
              }
            }
          },
          b: {
            type: {
              lastName: {
                type: String
              }
            }
          }
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })

      it('works for nested schemas with objects inside', () => {
        @TypedModel()
        class A {
          @Prop({
            type: {
              phoneNumber: {type: String}
            }
          })
          data: {phoneNumber: string}
        }

        @TypedModel()
        class B {
          @Prop({type: A, optional: true})
          a: A
        }

        @TypedModel()
        class Spec {
          @Prop({type: String})
          name: string

          @Prop({
            type: B
          })
          b: B
        }

        const expected = {
          name: {
            type: String
          },
          b: {
            type: {
              a: {
                optional: true,
                type: {
                  data: {
                    type: {
                      phoneNumber: {
                        type: String
                      }
                    }
                  }
                }
              }
            }
          }
        }

        expect(getSchemaForClass(Spec)).toEqual(expected)
      })
    })
  })

  describe('getModelForClass', () => {
    it('works for flat classes', () => {
      @TypedModel()
      class Spec {
        @Prop({optional: true, type: String})
        name: string
      }

      const expected = createModel({
        name: 'Spec',
        schema: {
          name: {
            type: String,
            optional: true
          }
        }
      })

      expect(getModelForClass(Spec).name).toEqual(expected.name)

      expect(getModelForClass(Spec).getCleanSchema()).toEqual(expected.getCleanSchema())
    })

    it('works for nested models', () => {
      @TypedModel()
      class A {
        @Prop({optional: true, type: String})
        name: string
      }

      const AModel = getModelForClass(A)
      @TypedModel()
      class Spec {
        @Prop({type: AModel})
        a: A
      }

      const expected = createModel({
        name: 'Spec',
        schema: {
          a: {
            type: AModel
          }
        }
      })

      expect(getModelForClass(Spec).name).toEqual(expected.name)
      expect(getModelForClass(Spec).getCleanSchema()).toEqual(expected.getCleanSchema())
    })

    it('works for nested arrays of models', () => {
      @TypedModel()
      class A {
        @Prop({optional: true, type: String})
        name: string
      }

      const AModel = getModelForClass(A)
      @TypedModel()
      class Spec {
        @Prop({type: [AModel]})
        a: A[]
      }

      const expected = createModel({
        name: 'Spec',
        schema: {
          a: {
            type: [AModel]
          }
        }
      })

      expect(getModelForClass(Spec).name).toEqual(expected.name)
      expect(getModelForClass(Spec).getCleanSchema()).toEqual(expected.getCleanSchema())
    })

    it('works for nested models together with nested classes', () => {
      @TypedModel()
      class NestedModelClass {
        @Prop({optional: true, type: String})
        name: string
      }

      class NestedClassClass {
        @Prop({type: {firstName: String, createdAt: Date}})
        data: {firstName: string; createdAt: Date}
      }

      const NestedModel = getModelForClass(NestedModelClass)
      @TypedModel()
      class Spec {
        @Prop({type: NestedModel})
        a: NestedModelClass

        @Prop({type: NestedClassClass})
        b: NestedClassClass
      }

      const expected = createModel({
        name: 'Spec',
        schema: {
          a: {
            type: NestedModel
          },
          b: {
            type: {
              data: {
                type: {
                  firstName: {
                    type: String
                  },
                  createdAt: {
                    type: Date
                  }
                }
              }
            }
          }
        }
      })

      expect(getModelForClass(Spec).name).toEqual(expected.name)
      expect(getModelForClass(Spec).getCleanSchema()).toEqual(expected.getCleanSchema())
    })

    it('Should return the same object when calling getModelForClass multiple times', () => {
      @TypedModel()
      class Spec {
        @Prop({type: String})
        name: string
      }

      const model = getModelForClass(Spec)
      expect(getModelForClass(Spec)).toBe(model)
    })
  })

  describe('using resolvers', () => {
    it('allows passing resolvers to the model', () => {
      const exampleResolver = modelResolver({
        returns: String,
        resolve: async (user: User, {title}: {title: string}) => {
          return `${title} ${user.firstName} ${user.lastName}`
        }
      })

      @TypedModel()
      class User {
        @Prop({type: String})
        firstName: string

        @Prop({type: String})
        lastName: string

        @ResolverProp(exampleResolver)
        fullName: typeof exampleResolver.modelResolve
      }

      const expected = createModel({
        name: 'User',
        schema: {
          firstName: {
            type: String
          },
          lastName: {
            type: String
          }
        },
        resolvers: {
          fullName: exampleResolver
        }
      })

      const model = getModelForClass(User)

      expect(model.name).toEqual(expected.name)
      expect(model.getCleanSchema()).toEqual(expected.getCleanSchema())
      expect(model.getResolvers()).toEqual(expected.getResolvers())
    })
  })

  describe('creating schemas', () => {
    it('allows creating multiple classes with the same name', () => {
      const create = () => {
        @TypedModel()
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
      @TypedModel()
      class ResolverParams {
        @Prop({type: String})
        firstName: string
      }

      @TypedModel()
      class ResolverReturns {
        @Prop({type: String}  )
        fullName: string
      }

      const fullName = modelResolver({
        params: ResolverParams,
        returns: ResolverReturns,
        async resolve(item: Person, params: ResolverParams): Promise<ResolverReturns> {
          return {fullName: `${params.firstName} ${item.lastName}`}
        }
      })

      @TypedModel()
      class Person {
        @Prop({type: String}  )
        lastName: string

        @ResolverProp(fullName)
        fullName: typeof fullName.modelResolve
      }

      const model = getModelForClass(Person)
      const item: Person = model.initItem({lastName: 'Doe'})

      const result = await item.fullName({
        firstName: 'John'
      })

      expect(result.fullName).toBe('John Doe')
    })
  })
})
