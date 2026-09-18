export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
}

export function formatLog(entry: LogEntry): string {
  const { timestamp, level, message, data } = entry;
  if (data) {
    return `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}`;
  }
  return `[${timestamp}] [${level}] ${message}`;
}

export function formatJsonLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}
