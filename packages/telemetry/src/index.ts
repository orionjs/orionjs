import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node'
import {NodeSDK, NodeSDKConfiguration} from '@opentelemetry/sdk-node'
const {PrometheusExporter} = require('@opentelemetry/exporter-prometheus')
const {HostMetrics} = require('@opentelemetry/host-metrics')

function setupTelemetry({
  nodeSDKConfig,
  metrics,
}: {
  nodeSDKConfig?: Partial<NodeSDKConfiguration>
  metrics?: {
    disable?: boolean
    port?: number
  }
}) {
  const metricReader = metrics?.disable
    ? undefined
    : new PrometheusExporter({port: metrics?.port || 9465})
  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-graphql': {
          ignoreResolveSpans: true,
        },
      }),
    ],
    metricReader,
    ...nodeSDKConfig,
  })

  if (metricReader) {
    const hostMetrics = new HostMetrics()
    hostMetrics.start()
  }

  sdk.start()
}

export {setupTelemetry}
