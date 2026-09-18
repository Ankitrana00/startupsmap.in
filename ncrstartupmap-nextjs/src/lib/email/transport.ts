import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.example.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  await transporter.sendMail({
      from: smtpUser
      ? `"StartupsMap.in" <${smtpUser}>`
      : `"StartupsMap.in" <noreply@startupsmap.in>`,
    to,
    subject,
    html,
    text,
  });
}
