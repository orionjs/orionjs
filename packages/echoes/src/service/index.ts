import echo from '../echo'
import { EchoConfig, EchoesMap } from '../types'
import { getInstance, Service } from '@orion-js/services'

export interface EchoesPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: EchoConfig['resolve']
}
// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, { _serviceType: string }>();
const echoesMetadata = new WeakMap<any, Record<string, any>>();

export function Echoes() {
  return function (target: any, context: ClassDecoratorContext<any>) {
    Service()(target, context);

    context.addInitializer(function (this) {
      serviceMetadata.set(this, { _serviceType: 'echoes' });
    });
  };
}


export function EchoEvent<This, TArgs extends Parameters<EchoConfig['resolve']>, TReturn extends ReturnType<EchoConfig['resolve']>>(options: Omit<EchoConfig, 'resolve' | 'type'> = {}) {
  return function (
    method: (this: This, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<This, typeof method>
  ) {
    const propertyKey = String(context.name);

    context.addInitializer(function (this: This) {
      const echoes = echoesMetadata.get(context.metadata) || {};

      echoes[propertyKey] = echo({
        ...options,
        type: 'event',
        resolve: this[propertyKey].bind(this)
      });

      echoesMetadata.set(this, echoes);
    });

    return method;
  }
}


export function EchoRequest<This, TArgs extends Parameters<EchoConfig['resolve']>, TReturn extends ReturnType<EchoConfig['resolve']>>(options: Omit<EchoConfig, 'resolve' | 'type'> = {}) {
  return function (
    method: (this: This, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<This, typeof method>
  ) {
    const propertyKey = String(context.name);

    context.addInitializer(function (this: This) {
      const echoes = echoesMetadata.get(context.metadata) || {};

      echoes[propertyKey] = echo({
        ...options,
        type: 'request',
        resolve: this[propertyKey].bind(this)
      });

      echoesMetadata.set(this, echoes);
    });

    return method;
  }
}


export function getServiceEchoes(target: any): EchoesMap {
  const instance = getInstance(target);

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error('You must pass a class decorated with @Echoes to getServiceEchoes');
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'echoes') {
    throw new Error('You must pass a class decorated with @Echoes to getServiceEchoes');
  }

  const echoesMap = echoesMetadata.get(instance) || {};

  return echoesMap;
}
