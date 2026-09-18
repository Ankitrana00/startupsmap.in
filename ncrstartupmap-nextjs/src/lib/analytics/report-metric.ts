interface Metric {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: string;
}

export function reportMetric(metric: Omit<Metric, "timestamp">): void {
  const fullMetric: Metric = {
    ...metric,
    timestamp: new Date().toISOString(),
  };

  if (typeof fetch !== "undefined") {
    fetch("/api/analytics/metric", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullMetric),
    }).catch(console.error);
  }
}

export function reportTiming(name: string, duration: number, tags?: Record<string, string>): void {
  reportMetric({ name, value: duration, unit: "ms", tags });
}
