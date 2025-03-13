import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node'
import {NodeSDK, NodeSDKConfiguration} from '@opentelemetry/sdk-node'
import {PrometheusExporter} from '@opentelemetry/exporter-prometheus'
import {HostMetrics} from '@opentelemetry/host-metrics'

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
    : new PrometheusExporter({port: metrics?.port || 9464})
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

  sdk.start()

  if (metricReader) {
    const hostMetrics = new HostMetrics()
    hostMetrics.start()
  }
}

export {setupTelemetry}
