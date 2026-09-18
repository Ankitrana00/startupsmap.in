interface AnalyticsEvent {
  event: string;
  category: string;
  label?: string;
  value?: number;
  properties?: Record<string, unknown>;
}

export function trackEvent(event: AnalyticsEvent): void {
  const payload = {
    ...event,
    timestamp: new Date().toISOString(),
    userId: typeof window !== "undefined" ? window.localStorage?.getItem("userId") : null,
  };

  // Send to analytics endpoint
  if (typeof fetch !== "undefined") {
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(console.error);
  }
}
