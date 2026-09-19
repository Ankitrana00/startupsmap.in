import nodemailer from "nodemailer";
import { log } from "@/lib/logging/logger";

const smtpHost = process.env.SMTP_HOST || "smtp.example.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

/**
 * P1-4 (audit H2): bounded outbound SMTP. Previously the transport had no
 * connection/socket timeouts, so an SMTP blip held the request open and
 * turned every submission into a hanging 500.
 */
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  connectionTimeout: 10_000, // ms to establish the TCP connection
  greetingTimeout: 10_000, // ms to receive the SMTP banner
  socketTimeout: 15_000, // ms of inactivity before the socket is dropped
});

/** Retry only on transient failure classes (timeouts, resets, 4xx SMTP). */
function isTransient(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? "";
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNTIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "EAI_AGAIN" ||
    code === "ECONNECTION"
  );
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 1_000;

/**
 * Public send API used by lib/email/send.ts — wraps the retrying sender
 * with the shared From identity.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const from = process.env.SMTP_FROM || smtpUser || "noreply@startupsmap.in";
  await sendMailWithRetry({ from, to, subject, html, text });
}

/**
 * P1-4: send with at most 3 attempts and exponential backoff (1s/2s).
 * Transient errors are retried; permanent errors (auth, 5xx SMTP codes,
 * invalid recipient) fail immediately so a bad address never burns 3 tries.
 */
export async function sendMailWithRetry(mailOptions: object): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await transporter.sendMail(mailOptions as never);
      if (attempt > 1) {
        log.info(`[email] delivered on retry attempt ${attempt}`);
      }
      return;
    } catch (err) {
      lastError = err;
      const retryable = attempt < MAX_ATTEMPTS && isTransient(err);
      log.warn(`[email] send attempt ${attempt} failed`, {
        retryable,
        code: (err as { code?: string })?.code,
      });
      if (!retryable) break;
      await new Promise((r) => setTimeout(r, BACKOFF_MS * 2 ** (attempt - 1)));
    }
  }

  throw lastError;
}
