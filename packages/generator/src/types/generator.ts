export enum GeneratorResources {
  JOB = 'job',
  MODEL = 'model',
  COLLECTION = 'collection',
  RESOLVER = 'resolver',
  COMPONENT = 'component'
}

export type Resource = `${GeneratorResources}`

export type Legacy = boolean

export type JobLegacyTypes = 'recurrent' | 'event'
export type JobTypes = 'recurrent' | 'single'

export type ResolverTypes = 'query' | 'mutation' | 'paginated'

export type GeneratorOptions<T, L> = {
  name: string
  path?: string
  legacy?: boolean
  type?: T extends GeneratorResources.JOB
    ? L extends true
      ? JobLegacyTypes
      : JobTypes
    : T extends GeneratorResources.RESOLVER
    ? ResolverTypes
    : undefined
}

// export type Generator<T extends GeneratorResources, L extends boolean> = (
//   resource: T,
//   options: GeneratorOptions<T, L>
// ) => Promise<void>
