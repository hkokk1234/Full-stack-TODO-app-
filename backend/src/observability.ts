import * as Sentry from "@sentry/node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import config from "./config/env";

let otelSdk: NodeSDK | null = null;

if (config.sentryDsnBackend) {
  Sentry.init({
    dsn: config.sentryDsnBackend,
    environment: config.env,
    tracesSampleRate: 0.2
  });
}

if (config.otelEnabled) {
  otelSdk = new NodeSDK({
    traceExporter: config.otelExporterOtlpEndpoint
      ? new OTLPTraceExporter({ url: config.otelExporterOtlpEndpoint })
      : new OTLPTraceExporter(),
    instrumentations: [getNodeAutoInstrumentations()]
  });

  otelSdk.start();
}

export const captureException = (error: unknown): void => {
  if (config.sentryDsnBackend) {
    Sentry.captureException(error);
  }
};

export const shutdownObservability = async (): Promise<void> => {
  if (otelSdk) {
    await otelSdk.shutdown();
  }
  if (config.sentryDsnBackend) {
    await Sentry.close(2000);
  }
};
