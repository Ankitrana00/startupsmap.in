export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const logLevel: LogLevel = process.env.LOG_LEVEL
  ? (parseInt(process.env.LOG_LEVEL, 10) as LogLevel)
  : LogLevel.INFO;

type LogMethod = "log" | "debug" | "warn" | "error";

const logMethodMap: Record<LogLevel, LogMethod> = {
  [LogLevel.DEBUG]: "debug",
  [LogLevel.INFO]: "log",
  [LogLevel.WARN]: "warn",
  [LogLevel.ERROR]: "error",
};

export function logger(level: LogLevel, message: string, data?: unknown): void {
  if (level < logLevel) return;

  const timestamp = new Date().toISOString();
  const levelNames = ["DEBUG", "INFO", "WARN", "ERROR"];
  const levelName = levelNames[level];
  const method = logMethodMap[level];

  if (data) {
    console[method](`[${timestamp}] [${levelName}] ${message}`, data);
  } else {
    console[method](`[${timestamp}] [${levelName}] ${message}`);
  }
}

export const log = {
  debug: (message: string, data?: unknown) => logger(LogLevel.DEBUG, message, data),
  info: (message: string, data?: unknown) => logger(LogLevel.INFO, message, data),
  warn: (message: string, data?: unknown) => logger(LogLevel.WARN, message, data),
  error: (message: string, data?: unknown) => logger(LogLevel.ERROR, message, data),
};
