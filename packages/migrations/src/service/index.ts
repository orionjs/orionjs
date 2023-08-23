import {ExecutionContext} from '@orion-js/dogs'
import {getInstance} from '@orion-js/services'
import {Service} from '@orion-js/services'

export interface MigrationServiceOptions {
  name: string
  useMongoTransactions: false
}

export function MigrationService(options: MigrationServiceOptions): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
    target.prototype.options = options
    target.prototype.serviceType = 'migration'
  }
}

export type MigrationExecutable = {
  runMigration(context: ExecutionContext): Promise<void>
} & MigrationServiceOptions

export function getMigrationsFromServices(services: any[]): MigrationExecutable[] {
  return services
    .filter(service => service.prototype.serviceType === 'migration')
    .map(service => {
      const options = service.prototype.options
      return {
        ...options,
        runMigration: async (context: ExecutionContext) => {
          const instance = getInstance(service) as any
          return await instance.runMigration(context)
        }
      }
    })
}
