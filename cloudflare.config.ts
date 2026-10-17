import { bindings, defineConfig, defineWorker, exports } from "cf/config";

export default defineConfig({
  accountId: "6aff32dcfccd82725dad359a525e2a7f",
  worker: defineWorker({
    name: "settlers",
    entrypoint: "./workers/app.ts",
    compatibilityDate: "2026-10-17",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      ROOMS: bindings.durableObject({ worker: "settlers", exportName: "GameRoom" }),
    },
    exports: { GameRoom: exports.durableObject({ storage: "sqlite" }) },
    observability: {
      enabled: true,
      headSamplingRate: 0.1,
      redactQueryString: true,
      traces: { enabled: true, headSamplingRate: 0.1 },
    },
  }),
});
