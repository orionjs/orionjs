type Token<T> = {new (...args: any[]): T}

const instances = new Map<Token<any>, any>()
const injectionsByClass = new Map<Function, Record<string, () => Token<any>>>()

// Temporary storage for field decorator metadata, picked up by Service class decorator
let pendingInjections: Record<string, () => Token<any>> = {}

// Validators registered by field decorators, run by Service class decorator
let pendingFieldValidators: Array<() => void> = []

export function addPendingFieldValidator(validator: () => void) {
  pendingFieldValidators.push(validator)
}

export function Service() {
  return (target: Function, _context: ClassDecoratorContext) => {
    if (Object.keys(pendingInjections).length > 0) {
      injectionsByClass.set(target, pendingInjections)
      pendingInjections = {}
    }

    // Run any pending field validators (e.g., MongoCollection checking for @Repository)
    const validators = pendingFieldValidators
    pendingFieldValidators = []
    for (const validator of validators) {
      validator()
    }
  }
}

export function Inject<T>(getDependency: () => Token<T>) {
  return (_: undefined, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)
    if (!getDependency) {
      throw new Error(
        `Since v4, Inject() requires a function that returns the dependency token. Check the @Inject() of ${propertyKey}`,
      )
    }
    pendingInjections[propertyKey] = getDependency
  }
}

export function setInstance<T extends object>(token: Token<T>, instance: T) {
  instances.set(token, instance)
}

// Post-init field factories (e.g., MongoCollection defers createCollection to getInstance time)
const fieldFactoriesByClass = new Map<Function, Record<string, () => any>>()

export function registerFieldFactories(target: Function, factories: Record<string, () => any>) {
  const existing = fieldFactoriesByClass.get(target) || {}
  fieldFactoriesByClass.set(target, {...existing, ...factories})
}

export function getInstance<T extends object>(token: Token<T>): T {
  if (!instances.has(token)) {
    const instance = new token()
    instances.set(token, instance)

    const injections = injectionsByClass.get(token)
    if (injections) {
      for (const [propertyKey, getDependency] of Object.entries(injections)) {
        instance[propertyKey] = getInstance(getDependency())
      }
    }

    const fieldFactories = fieldFactoriesByClass.get(token)
    if (fieldFactories) {
      for (const [key, factory] of Object.entries(fieldFactories)) {
        instance[key] = factory()
      }
    }
  }
  return instances.get(token)
}
