#!/usr/bin/env node
import { Effect, Layer } from "effect";
import {
  NodeHttpClient,
  NodeRuntime,
  NodeServices,
} from "@effect/platform-node";
import { CliConfig, Command, GlobalFlag } from "effect/unstable/cli";
import { OtlpSerialization, OtlpTracer } from "effect/unstable/observability";
import packageJson from "../package.json" with { type: "json" };
import jobPostingsCommand from "./cli/commands/job-postings-command.js";
import GoogleTools from "./google/google-tools.js";

/**
 * Excludes the `--completions`, `--wizard`, and `--log-level` built-in
 * flags, which aren't useful for this single-command CLI
 */
const CliConfigLayer = CliConfig.layer({
  builtIns: GlobalFlag.BuiltIns.filter(
    (flag) =>
      flag !== GlobalFlag.Completions &&
      flag !== GlobalFlag.Wizard &&
      flag !== GlobalFlag.LogLevel,
  ),
});

/**
 * Exports Effect spans to an OTLP collector when the standard
 * `OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_TRACES_EXPORTER` environment variables
 * are set, and stays a no-op otherwise
 */
const ObservabilityLayer = OtlpTracer.layerFromConfig({
  resource: {
    serviceName: packageJson.name,
    serviceVersion: packageJson.version,
  },
}).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(NodeHttpClient.layerUndici),
);

Command.run(jobPostingsCommand, { version: packageJson.version }).pipe(
  Effect.provide(
    Layer.mergeAll(GoogleTools.layer, ObservabilityLayer, CliConfigLayer).pipe(
      Layer.provideMerge(NodeServices.layer),
    ),
  ),
  NodeRuntime.runMain,
);
