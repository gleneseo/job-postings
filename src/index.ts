#!/usr/bin/env node
import { Console, Effect, Layer } from "effect";
import {
  NodeHttpClient,
  NodeRuntime,
  NodeServices,
} from "@effect/platform-node";
import { Command } from "effect/unstable/cli";
import { OtlpSerialization, OtlpTracer } from "effect/unstable/observability";
import packageJson from "../package.json" with { type: "json" };
import jobPostingsCommand from "./cli/commands/job-postings-command.js";
import GoogleTools from "./google/google-tools.js";
import FileWriter from "./file-system/file-writer.js";

const banner = `

  888888        888        8888888b.                 888   d8b
    "88b        888        888   Y88b                888   Y8P
     888        888        888    888                888
     888 .d88b. 88888b.    888   d88P .d88b. .d8888b 88888888888888b.  .d88b. .d8888b
     888d88""88b888 "88b   8888888P" d88""88b88K     888   888888 "88bd88P"88b88K
     888888  888888  888   888       888  888"Y8888b.888   888888  888888  888"Y8888b.
     88PY88..88P888 d88P   888       Y88..88P     X88Y88b. 888888  888Y88b 888     X88
     888 "Y88P" 88888P"    888        "Y88P"  88888P' "Y888888888  888 "Y88888 88888P'
   .d88P                                                                   888
 .d88P"                                                               Y8b d88P
888P"                                                                  "Y88P"

`;

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

Effect.gen(function* () {
  if (process.stdout.isTTY) {
    yield* Console.log(banner);
  }
  yield* Command.run(jobPostingsCommand, { version: packageJson.version });
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      GoogleTools.layer,
      FileWriter.layer,
      ObservabilityLayer,
    ).pipe(Layer.provideMerge(NodeServices.layer)),
  ),
  NodeRuntime.runMain,
);
