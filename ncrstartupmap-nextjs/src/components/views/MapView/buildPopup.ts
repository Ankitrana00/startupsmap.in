import type { Startup } from "@/lib/types/startup";
import { sanitizeUrl } from "@/lib/security/sanitize";

function escapeHtml(value: string | null | undefined): string {
  // Real Supabase rows can have null in any text column (the old seed data
  // never did), so treat missing values as empty strings instead of crashing.
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function hiringLabelText(isHiring: boolean | null): string {
  if (isHiring === true) return "Hiring";
  if (isHiring === false) return "Not hiring";
  return "Unconfirmed";
}

/** Popup markup for a map marker. Mirrors StartupCard so the pin card and
 *  the grid card feel like one product. Kept as an HTML string because
 *  Leaflet renders popups outside React. */
export function buildPopupHTML(startup: Startup): string {
  const name = escapeHtml(startup.name ?? "Unnamed startup");
  const hiringClass =
    startup.is_hiring === true
      ? "popup-tag--hiring"
      : startup.is_hiring === null || startup.is_hiring === undefined
        ? "popup-tag--unconfirmed"
        : "";

  const infoTags = [startup.sector, startup.stage]
    .filter((tag) => Boolean(tag)) // sector/stage may be null in the DB
    .map((tag) => `<span class="popup-tag">${escapeHtml(tag)}</span>`)
    .join("");
  const foundedTag =
    startup.founded != null
      ? `<span class="popup-tag">Est. ${escapeHtml(String(startup.founded))}</span>`
      : "";
  const hiringTag = `<span class="popup-tag${hiringClass ? ` ${hiringClass}` : ""}">${escapeHtml(hiringLabelText(startup.is_hiring))}</span>`;

  const safeWebsite = sanitizeUrl(startup.website ?? "");
  const safeLinkedin = sanitizeUrl(startup.linkedin ?? "");
  const iconSvg = (paths: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const websiteIcon = safeWebsite
    ? `<a class="popup-icon-btn" href="${safeWebsite}" target="_blank" rel="noreferrer noopener" aria-label="Open ${name} website">${iconSvg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>')}</a>`
    : "";
  const linkedinIcon = safeLinkedin
    ? `<a class="popup-icon-btn" href="${safeLinkedin}" target="_blank" rel="noreferrer noopener" aria-label="Open ${name} on LinkedIn">${iconSvg('<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>')}</a>`
    : "";

  const pinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

  const description = startup.description ?? "";
  const fullLocation = startup.address ?? startup.area ?? "NCR";
  const tagsRow = `${infoTags}${foundedTag}`;
  const tagsHtml = tagsRow ? `<div class="popup-tags">${tagsRow}</div>` : "";

  return `
    <article class="popup-card">
      <div class="popup-top">
        <p class="popup-title">${name}</p>
        ${hiringTag}
      </div>
      ${description ? `<p class="popup-desc">${escapeHtml(description)}</p>` : ""}
      ${tagsHtml}
      <div class="popup-foot">
        <span class="popup-area" title="${fullLocation}">${pinIcon}<span class="block max-w-10rem line-clamp-2 leading-tight">${escapeHtml(fullLocation)}</span></span>
        <span class="popup-actions">${websiteIcon}${linkedinIcon}</span>
      </div>
    </article>
  `;
}
