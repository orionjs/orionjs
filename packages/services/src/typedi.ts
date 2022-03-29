import Container, {Constructable} from 'typedi'

export {Service, Inject} from 'typedi'

export function getInstance<T>(service: Constructable<T>): T {
  return Container.get(service)
}
