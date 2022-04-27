import Container, {Constructable} from 'typedi'

export {Service, Inject, Container} from 'typedi'

export function getInstance<T>(service: Constructable<T>): T {
  return Container.get(service)
}
