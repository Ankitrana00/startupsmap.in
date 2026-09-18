interface PageView {
  path: string;
  title?: string;
  referrer?: string;
  timestamp: string;
}

export function trackPageView(view: Omit<PageView, "timestamp">): void {
  const pageView: PageView = {
    ...view,
    timestamp: new Date().toISOString(),
  };

  if (typeof fetch !== "undefined") {
    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pageView),
    }).catch(console.error);
  }
}
