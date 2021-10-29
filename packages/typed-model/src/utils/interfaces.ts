export interface Constructor<T> extends Function {
  new (...args: unknown[]): T
}
