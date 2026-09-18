import { ExternalLink, Linkedin, MapPin, MapPinOff } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { hiringLabel, hiringTone } from "@/lib/badge-helpers";
import { sanitizeUrl } from "@/lib/security/sanitize";
import type { Startup } from "@/lib/types/startup";

export function StartupCard({ startup }: { startup: Startup }) {
  const mapped = startup.lat !== null && startup.lng !== null;
  const safeWebsite = sanitizeUrl(startup.website ?? "");
  const safeLinkedin = sanitizeUrl(startup.linkedin ?? "");

  return (
    <article
      data-testid="startup-card"
      className="group flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 focus-within:border-primary/50"
    >
      <header>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">{startup.name}</h3>
          <Badge tone={hiringTone(startup.is_hiring)}>{hiringLabel(startup.is_hiring)}</Badge>
        </div>
        {startup.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{startup.description}</p>
        )}
      </header>

      {(startup.sector || startup.stage || startup.founded != null) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {startup.sector && <Badge>{startup.sector}</Badge>}
          {startup.stage && <Badge>{startup.stage}</Badge>}
          {startup.founded != null && <Badge>Est. {startup.founded}</Badge>}
        </div>
      )}

      <footer className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {mapped ? (
            <MapPin className="size-3.5" aria-hidden="true" />
          ) : (
            <MapPinOff className="size-3.5" aria-hidden="true" />
          )}
          <span
            className="block max-w-48 line-clamp-2 leading-tight"
            title={startup.address ?? startup.area ?? undefined}
          >
            {startup.address ?? startup.area ?? "NCR"}
          </span>
        </span>
        <span className="flex items-center gap-1">
          {safeWebsite && (
            <a
              href={safeWebsite}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open ${startup.name} website`}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-primary"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}
          {safeLinkedin && (
            <a
              href={safeLinkedin}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open ${startup.name} on LinkedIn`}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-primary"
            >
              <Linkedin className="size-4" aria-hidden="true" />
            </a>
          )}
        </span>
      </footer>
    </article>
  );
}

