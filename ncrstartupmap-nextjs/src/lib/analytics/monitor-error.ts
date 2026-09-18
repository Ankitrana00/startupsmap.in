interface ErrorReport {
  error: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

export function monitorError(error: Error, context?: Record<string, unknown>): void {
  const report: ErrorReport = {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  // Send to error tracking service
  if (typeof fetch !== "undefined") {
    fetch("/api/analytics/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    }).catch(console.error);
  }

  // Only log full error details to console in development
  // In production, errors are already sent to the analytics endpoint
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.error("[Error Monitor]", report);
  }
}
