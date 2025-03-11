import { generateId } from '../../helpers/dist';

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol("Symbol.metadata");

type Token<T> = { new (...args: any[]): T };

export function Service() {
  return function (_target: any, context: ClassDecoratorContext<any> ) {
    context.metadata['_serviceId'] = `${generateId(12)}`
    context.metadata['_serviceName'] = `${context.name}`
  };
}

export function Inject<T>(getDependency: () => Token<T>) {
  return function (_target: any, context: ClassFieldDecoratorContext<any, T>) {
    context.metadata[`_inject:${String(context.name)}`] = getDependency;
  };
}

class Container {
  private static instances = new Map<Function, any>();

  static get<T>(target: Token<T>): T {
    if (!this.instances.has(target)) {
      const instance = new target();
      this.instances.set(target, instance);

      const metadata = target[Symbol.metadata]
      const keys = Object.keys(metadata ?? {})
      const injectionKeys = keys.filter(key => key.startsWith('_inject'))
      if (injectionKeys.length > 0) {
        for (const key of injectionKeys) {
          const paramName = key.replace('_inject:', '')
          const dependency = metadata[key] as () => Token<any>
          instance[paramName] = Container.get(dependency());
        }
      }
    }
    return this.instances.get(target);
  }
}


export function getInstance<T>(token: Token<T>): T {
  return Container.get(token);
}

