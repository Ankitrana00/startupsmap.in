import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

const LOG_DIR = process.env.LOG_DIR || "./logs";

export function fileTransport(message: string, data?: unknown): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    const timestamp = new Date().toISOString();
    const logEntry = data
      ? `[${timestamp}] ${message} ${JSON.stringify(data)}\n`
      : `[${timestamp}] ${message}\n`;
    appendFileSync(join(LOG_DIR, "app.log"), logEntry);
  } catch {
    console.error("Failed to write to log file");
  }
}
