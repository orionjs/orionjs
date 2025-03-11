import { generateId } from '../../helpers/dist';

type Token<T> = { new(...args: any[]): T };

const serviceMetadata = new WeakMap<object, { id: string; name: string }>();
const injectionMetadata = new WeakMap<object, Record<string | symbol, () => Token<any>>>();

export function Service() {
  return function (_target: Function, context: ClassDecoratorContext) {
    serviceMetadata.set(context, {
      id: generateId(12),
      name: context.name,
    });
  };
}

export function Inject<T>(getDependency: () => Token<T>) {
  return function (_: undefined, context: ClassFieldDecoratorContext) {
    context.addInitializer(function (this: any) {
      const metadata = injectionMetadata.get(this) || {};
      metadata[context.name] = getDependency;
      injectionMetadata.set(this, metadata);
    });
  };
}

class Container {
  private static instances = new Map<Token<any>, any>();

  static get<T extends object>(target: Token<T>): T {
    if (!this.instances.has(target)) {
      const instance = new target();
      this.instances.set(target, instance);

      const injections = injectionMetadata.get(instance);
      if (injections) {
        for (const [propertyKey, getDependency] of Object.entries(injections)) {
          instance[propertyKey] = Container.get(getDependency());
        }
      }
    }
    return this.instances.get(target);
  }
}

export function getInstance<T extends object>(token: Token<T>): T {
  return Container.get(token);
}