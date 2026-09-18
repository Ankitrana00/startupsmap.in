import * as Sentry from "@sentry/nextjs";
import { sentrySharedOptions } from "./sentry.shared.config";

Sentry.init({
  ...sentrySharedOptions,
  // Replay off by default — re-enable with an explicit budget decision.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: [Sentry.replayIntegration()],
});
