export function consoleTransport(message: string, data?: unknown): void {
  if (data) {
    console.log(`[Console] ${message}`, data);
  } else {
    console.log(`[Console] ${message}`);
  }
}
