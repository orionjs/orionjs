import fieldTypes from '../fieldTypes'

export type FieldValidatorType = keyof typeof fieldTypes | 'custom' | 'plainObject'
