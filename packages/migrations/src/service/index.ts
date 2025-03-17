import {ExecutionContext} from '@orion-js/dogs'
import {getInstance} from '@orion-js/services'
import {Service} from '@orion-js/services'

export interface MigrationServiceOptions {
  name: string
  useMongoTransactions: false
}

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string; options: MigrationServiceOptions}>()

export function MigrationService(options: MigrationServiceOptions) {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {_serviceType: 'migrations', options: options})
    })
  }
}

export type MigrationExecutable = {
  runMigration(context: ExecutionContext): Promise<void>
} & MigrationServiceOptions

export function getMigrationsFromServices(services: any[]): MigrationExecutable[] {
  return services.map(service => {
    const instance = getInstance(service)
    const options = serviceMetadata.get(instance.constructor)
    if (!options._serviceType || options._serviceType !== 'migrations') {
      throw new Error(`Service ${service.name} is not a migration service`)
    }

    return {
      ...options.options,
      runMigration: async (context: ExecutionContext) => {
        const instance = getInstance(service) as any
        return await instance.runMigration(context)
      },
    }
  })
}
