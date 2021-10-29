import {createModel} from '@orion-js/models'
import {asSchemaNode, SchemaFieldTypes} from '@orion-js/schema'
import {asPropOptions} from './decorators'
import {CannotDetermineTypeError, CannotUseArrayError} from './errors'
import {Prop, Schema, getSchemaForClass, getModelForClass, Resolver} from './index'
import {MetadataStorage} from './storage/metadataStorage'

describe('typed-schema e2e tests', () => {
  beforeEach(() => {
    MetadataStorage.clearStorage()
  })

  describe('getSchemaForClass', () => {
    it('works for a simple schema', () => {
      @Schema()
      class Spec {
        @Prop({optional: true})
        name: string

        @Prop({optional: true})
        createdAt: Date

        @Prop({optional: true})
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
      @Schema()
      class Spec {
        @Prop({type: SchemaFieldTypes.String})
        name: string

        @Prop({type: SchemaFieldTypes.ID})
        _id: string

        @Prop({type: SchemaFieldTypes.Integer})
        age: number

        @Prop({type: SchemaFieldTypes.Blackbox})
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
      @Schema()
      class A {
        @Prop()
        name: string
      }

      class B extends A {
        @Prop()
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
      @Schema()
      class Spec {
        @Prop()
        name: string

        @Prop()
        age: number

        @Prop()
        createdAt: Date

        @Prop()
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
      it('throws if the object type is not explicitly specified', () => {
        expect(() => {
          @Schema()
          // eslint-disable-next-line no-unused-vars
          class Spec {
            @Prop()
            data: {a: string}
          }
        }).toThrow(CannotDetermineTypeError)
      })

      it('works for object types', () => {
        @Schema()
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
        @Schema()
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
      it('throws if the array type is not explicitly specified', () => {
        expect(() => {
          @Schema()
          // eslint-disable-next-line no-unused-vars
          class Spec {
            @Prop()
            names: string[]
          }
        }).toThrow(CannotUseArrayError)
      })

      it('works for array schemas', () => {
        @Schema()
        class Spec {
          @Prop(asPropOptions<never, string[]>({type: [String]}))
          names: string[]

          @Prop(asPropOptions<never, number[]>({type: [Number]}))
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
      it('throws if the class type is not explicitly specified', () => {
        @Schema()
        class A {
          @Prop()
          name: string
        }

        expect(() => {
          @Schema()
          // eslint-disable-next-line no-unused-vars
          class Spec {
            @Prop()
            a: A
          }
        }).toThrow(CannotDetermineTypeError)
      })

      it('works for nested schemas', () => {
        @Schema()
        class A {
          @Prop()
          name: string
        }

        @Schema()
        class B {
          @Prop()
          lastName: string
        }

        @Schema()
        class Spec {
          @Prop()
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
        @Schema()
        class A {
          @Prop(
            asSchemaNode<object>({
              type: {
                phoneNumber: {type: String}
              }
            })
          )
          data: {phoneNumber: string}
        }

        @Schema()
        class B {
          @Prop(asPropOptions<A>({type: A, optional: true}))
          a: A
        }

        @Schema()
        class Spec {
          @Prop()
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
      @Schema()
      class Spec {
        @Prop({optional: true})
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
      expect(getModelForClass(Spec).getSchema()).toEqual(expected.getSchema())
    })

    it('works for nested models', () => {
      @Schema()
      class A {
        @Prop({optional: true})
        name: string
      }

      const AModel = getModelForClass(A)
      @Schema()
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
      expect(getModelForClass(Spec).getSchema()).toEqual(expected.getSchema())
    })

    it('works for nested models together with nested classes', () => {
      @Schema()
      class NestedModelClass {
        @Prop({optional: true})
        name: string
      }

      class NestedClassClass {
        @Prop({type: {firstName: String, createdAt: Date}})
        data: {firstName: string; createdAt: Date}
      }

      const NestedModel = getModelForClass(NestedModelClass)
      @Schema()
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
      expect(getModelForClass(Spec).getSchema()).toEqual(expected.getSchema())
    })
  })

  describe('using resolvers', () => {
    it('allows passing resolvers to the model', () => {
      const exampleResolver = async (user, {title}: {title: string}): Promise<string> => {
        return `${title} ${user.firstName} ${user.lastName}`
      }

      const resolverSchema = {returns: String, params: {title: String}, resolve: exampleResolver}

      @Schema()
      class Spec {
        @Prop()
        firstName: string

        @Prop()
        lastName: string

        @Resolver(resolverSchema)
        fullName: typeof exampleResolver
      }

      const expected = createModel({
        name: 'Spec',
        schema: {
          firstName: {
            type: String
          },
          lastName: {
            type: String
          }
        },
        resolvers: {
          fullName: resolverSchema
        }
      })

      const model = getModelForClass(Spec)

      expect(model.name).toEqual(expected.name)
      expect(model.getSchema()).toEqual(expected.getSchema())
      expect(model.getResolvers()).toEqual(expected.getResolvers())
    })
  })
})
