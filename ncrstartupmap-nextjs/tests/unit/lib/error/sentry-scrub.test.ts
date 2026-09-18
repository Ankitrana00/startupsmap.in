import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "../../../../sentry.shared.config";

const DSN_KEY = "NEXT_PUBLIC_SENTRY_DSN";
const TEST_DSN = "https://abc123@o0.ingest.sentry.io/0";

function baseEvent(): Sentry.ErrorEvent {
  return {
    type: undefined,
    exception: { values: [{ type: "Error", value: "boom" }] },
  };
}

describe("scrubSentryEvent (Sentry Phase 4)", () => {
  const prev = process.env[DSN_KEY];

  beforeEach(() => {
    process.env[DSN_KEY] = TEST_DSN;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env[DSN_KEY];
    else process.env[DSN_KEY] = prev;
  });

  it("drops the event (null) when no DSN is configured", () => {
    delete process.env[DSN_KEY];
    expect(scrubSentryEvent(baseEvent())).toBeNull();
  });

  it("strips request bodies carrying form PII", () => {
    const event = { ...baseEvent(), request: { data: { email: "a@b.c", pocEmail: "x@y.z" } } };
    const out = scrubSentryEvent(event);
    expect(out).not.toBeNull();
    expect(out!.request?.data).toBeUndefined();
  });

  it("strips sensitive headers case-insensitively, keeps the rest", () => {
    const event = {
      ...baseEvent(),
      request: {
        headers: {
          Authorization: "Bearer secret",
          Cookie: "admin-token=abc",
          "X-Forwarded-For": "1.2.3.4",
          "Content-Type": "application/json",
        },
      },
    };
    const out = scrubSentryEvent(event);
    const headers = out!.request!.headers as Record<string, unknown>;
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["Cookie"]).toBeUndefined();
    expect(headers["X-Forwarded-For"]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("strips query strings from breadcrumb URLs", () => {
    const event = {
      ...baseEvent(),
      breadcrumbs: [{ data: { url: "https://startupsmap.in/submit?email=a@b.c&q=hello" } }],
    };
    const out = scrubSentryEvent(event);
    const url = (out!.breadcrumbs as Array<{ data: { url: string } }>)[0].data.url;
    expect(url).not.toContain("email=");
    expect(url).not.toContain("q=");
  });

  it("passes clean events through untouched", () => {
    const event = baseEvent();
    const out = scrubSentryEvent(event);
    expect(out).not.toBeNull();
    expect(out!.exception).toEqual(event.exception);
  });
});
