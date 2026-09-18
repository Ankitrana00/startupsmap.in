import { sendEmail } from "./transport";
import { sanitizeUrl } from "@/lib/security/sanitize";
import type { SubmitData } from "@/app/api/submit/validate";
import type { PromoteData } from "@/app/api/promote/validate";

/** Shared subject prefixes so both flows sort clearly in the owner's inbox. */
export const SUBJECT_PREFIX_STARTUP = "[Startup Submission]";
export const SUBJECT_PREFIX_PROMOTE = "[Promotion Ad]";

/** Escape user-provided text so it can never inject HTML into the email. */
function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Email a newly submitted startup to the site owner (SUBMISSIONS_TO,
 * falling back to the SMTP account itself).
 */
export async function sendSubmissionNotification(data: SubmitData): Promise<void> {
  const to = process.env.SUBMISSIONS_TO || process.env.SMTP_USER;
  if (!to) {
    throw new Error("SUBMISSIONS_TO is not configured");
  }

  const hiring = data.is_hiring === null ? "Not specified" : data.is_hiring ? "Hiring" : "Not hiring";
  const safeWebsite = sanitizeUrl(data.website ?? "");
  const safeLinkedin = sanitizeUrl(data.linkedin ?? "");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px;font-weight:600">${label}</td><td style="padding:6px 12px">${value}</td></tr>`;

  const html = `
    <h1>New Startup Submission</h1>
    <table style="border-collapse:collapse">
      ${row("Name", escapeHtml(data.name))}
      ${row("Description", escapeHtml(data.description))}
      ${row("Sector", escapeHtml(data.sector))}
      ${row("Stage", escapeHtml(data.stage))}
      ${row("Area", escapeHtml(data.area))}
      ${row("Founded", escapeHtml(data.founded))}
      ${row("Hiring", hiring)}
      ${row("Address", escapeHtml(data.address))}
      ${row("Coordinates", `${escapeHtml(data.lat)}, ${escapeHtml(data.lng)}`)}
      ${data.website ? row("Website", safeWebsite ? `<a href="${safeWebsite}">${escapeHtml(data.website)}</a>` : escapeHtml(data.website)) : ""}
      ${data.linkedin ? row("LinkedIn", safeLinkedin ? `<a href="${safeLinkedin}">${escapeHtml(data.linkedin)}</a>` : escapeHtml(data.linkedin)) : ""}
    </table>
    <p>Review it and add it to the map if it looks legitimate.</p>
  `;

  // Plain-text alternative for email clients that block HTML
  const text = [
    "New Startup Submission",
    "======================",
    `Name: ${data.name}`,
    `Description: ${data.description}`,
    `Sector: ${data.sector}`,
    `Stage: ${data.stage}`,
    `Area: ${data.area}`,
    `Founded: ${data.founded}`,
    `Hiring: ${hiring}`,
    `Address: ${data.address}`,
    `Coordinates: ${data.lat}, ${data.lng}`,
    data.website ? `Website: ${data.website}` : "",
    data.linkedin ? `LinkedIn: ${data.linkedin}` : "",
    "",
    "Review it and add it to the map if it looks legitimate.",
  ].filter(Boolean).join("\n");

  // Plain-text header: collapse whitespace/newlines so the name can never
  // break the subject header, and cap its length.
  const safeName = data.name.replace(/\s+/g, " ").trim().slice(0, 80);
  await sendEmail(to, `${SUBJECT_PREFIX_STARTUP} ${safeName}`, html, text);
}

/**
 * Send a confirmation email to the submitter acknowledging receipt.
 */
export async function sendSubmitterConfirmation(data: SubmitData): Promise<void> {
  const to = data.email;
  const safeName = data.name.replace(/\s+/g, " ").trim().slice(0, 80);

  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif">
      <h1 style="color: #1f2120">Submission Received</h1>
      <p>Hi there,</p>
      <p>Thank you for submitting <strong>${escapeHtml(data.name)}</strong> to StartupsMap.in.</p>
      <p>We have received your startup submission and our team will review it within 2-3 business days.</p>
      <p>If your startup is approved, it will appear on our NCR startup map.</p>
      <div style="margin-top: 20px; padding: 15px; background: #f3f4f3; border-radius: 8px">
        <p style="margin: 0; font-weight: 600">Your Submission Summary:</p>
        <ul style="margin-top: 8px; padding-left: 20px">
          <li><strong>Name:</strong> ${escapeHtml(data.name)}</li>
          <li><strong>Sector:</strong> ${escapeHtml(data.sector)}</li>
          <li><strong>Stage:</strong> ${escapeHtml(data.stage)}</li>
          <li><strong>Area:</strong> ${escapeHtml(data.area)}</li>
          <li><strong>Founded:</strong> ${escapeHtml(data.founded)}</li>
        </ul>
      </div>
      <p style="margin-top: 20px">Best regards,<br />StartupsMap.in Team</p>
    </div>
  `;

  const text = [
    "Submission Received",
    "==================",
    "",
    "Hi there,",
    "",
    `Thank you for submitting "${data.name}" to StartupsMap.in.`,
    "",
    "We have received your startup submission and our team will review it within 2-3 business days.",
    "If your startup is approved, it will appear on our NCR startup map.",
    "",
    "Your Submission Summary:",
    `- Name: ${data.name}`,
    `- Sector: ${data.sector}`,
    `- Stage: ${data.stage}`,
    `- Area: ${data.area}`,
    `- Founded: ${data.founded}`,
    "",
    "Best regards,",
    "StartupsMap.in Team",
  ].join("\n");

  await sendEmail(to, `We received your startup submission: ${safeName}`, html, text);
}

/**
 * Email a promotion-ads lead ("Promote Your Startup" form) to the same
 * owner inbox, labeled [Promotion Ad] so the two flows never blur.
 */
export async function sendPromotionLead(data: PromoteData): Promise<void> {
  const to = process.env.PROMOTE_TO || process.env.SUBMISSIONS_TO || process.env.SMTP_USER;
  if (!to) {
    throw new Error("PROMOTE_TO is not configured");
  }

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px;font-weight:600">${label}</td><td style="padding:6px 12px">${value}</td></tr>`;

  const html = `
    <h1>New Promotion Ad Request</h1>
    <table style="border-collapse:collapse">
      ${row("Company", escapeHtml(data.companyName))}
      ${row("POC", escapeHtml(data.pocName))}
      ${row("POC Email", escapeHtml(data.pocEmail))}
      ${row("Contact", escapeHtml(data.contactNumber))}
      ${row("Message", escapeHtml(data.message).replace(/\n/g, "<br />"))}
    </table>
    <p>Contact them to discuss the featured-ad slot.</p>
  `;

  // Plain-text alternative for email clients that block HTML
  const text = [
    "New Promotion Ad Request",
    "========================",
    `Company: ${data.companyName}`,
    `POC: ${data.pocName}`,
    `POC Email: ${data.pocEmail}`,
    `Contact: ${data.contactNumber}`,
    `Message: ${data.message}`,
    "",
    "Contact them to discuss the featured-ad slot.",
  ].join("\n");

  // Plain-text header: same newline/length hardening as the startup flow.
  const safeCompany = data.companyName.replace(/\s+/g, " ").trim().slice(0, 80);
  await sendEmail(to, `${SUBJECT_PREFIX_PROMOTE} ${safeCompany}`, html, text);
}
