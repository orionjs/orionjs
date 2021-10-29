import {CannotDetermineTypeError, CannotUseArrayError} from './errors'
import {Prop, Schema, getSchemaForClass} from './index'
import {MetadataStorage} from './storage/metadataStorage'

describe('typed-schema e2e tests', () => {
  beforeEach(() => {
    MetadataStorage.clearStorage()
  })
  it('works for a simple schema', () => {
    @Schema()
    class Spec {
      @Prop({optional: true})
      name: string
    }

    const expected = {
      name: {
        type: String,
        optional: true
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
        @Prop({
          type: {
            phoneNumber: {type: String}
          }
        })
        data: {phoneNumber: string}
      }

      @Schema()
      class B {
        @Prop({type: A})
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
