import {generateId} from '../../helpers/dist'

type Token<T> = {new (...args: any[]): T}

const instances = new Map<Token<any>, any>()
const serviceMetadata = new WeakMap<object, {id: string; name: string}>()
const injectionMetadata = new WeakMap<object, Record<string | symbol, () => Token<any>>>()

export function Service() {
  return (_target: Function, context: ClassDecoratorContext) => {
    serviceMetadata.set(context, {
      id: generateId(12),
      name: context.name,
    })
  }
}

export function Inject<T>(getDependency: () => Token<T>) {
  return (_: undefined, context: ClassFieldDecoratorContext) => {
    context.addInitializer(function (this: any) {
      const metadata = injectionMetadata.get(this) || {}
      metadata[context.name] = getDependency
      injectionMetadata.set(this, metadata)
    })
  }
}

export function getInstance<T extends object>(token: Token<T>): T {
  if (!instances.has(token)) {
    const instance = new token()
    instances.set(token, instance)

    const injections = injectionMetadata.get(instance)
    if (injections) {
      for (const [propertyKey, getDependency] of Object.entries(injections)) {
        instance[propertyKey] = getInstance(getDependency())
      }
    }
  }
  return instances.get(token)
}
