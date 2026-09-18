interface CloudWatchConfig {
  region: string;
  logGroup: string;
  logStream: string;
}

let config: CloudWatchConfig | null = null;

export function initCloudWatch(cfg: CloudWatchConfig): void {
  config = cfg;
}

export function cloudwatchTransport(message: string, data?: unknown): void {
  if (!config) {
    console.warn("CloudWatch not initialized");
    return;
  }
  // CloudWatch Logs SDK would go here
  console.log(`[CloudWatch] ${message}`, data || "");
}
