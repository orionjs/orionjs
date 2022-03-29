export type LogFunction = (message: string, metadata?: any) => void

export interface OrionLogger {
  debug: LogFunction
  info: LogFunction
  warn: LogFunction
  error: LogFunction
  addContext: (module: NodeJS.Module) => OrionLogger
  addMetadata: (metadata: any) => OrionLogger
}
