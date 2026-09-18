import Image from "next/image";
import Link from "next/link";
import { sanitizeAdTarget } from "@/lib/security/sanitize";

interface CarouselItemProps {
  image?: string;
  title: string;
  link: string;
  isPromo?: boolean;
}

// Phase 3B/U5: explicit paid-ad disclosure on every card.
function AdBadge() {
  return (
    <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-white">
      Ad
    </span>
  );
}

function CardLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  // Phase 3A/U5: internal links use next/link (no new tab); external keep the
  // safe target=_blank / noopener pattern.
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export function CarouselItem({ image, title, link, isPromo = false }: CarouselItemProps) {
  const safeLink = sanitizeAdTarget(link);

  // Phase 1 crash guard: next/image throws on empty src. Only non-promo
  // ads WITH a real image take the image branch; everything else
  // (promo cards, missing/empty image) uses the text fallback — never <Image>.
  if (isPromo || !image) {
    const body = (
      // Phase 2C/U5: design tokens (surface/border/foreground), solid ad-card
      // look instead of the dashed drop-zone.
      <div className="relative flex h-25 flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-surface px-4 py-5">
        <AdBadge />
        <p className="text-center font-sans text-sm font-medium leading-snug tracking-wide text-foreground">
          {title}
        </p>
      </div>
    );
    if (!safeLink) return body;
    return (
      <CardLink href={safeLink} className="block">
        {body}
      </CardLink>
    );
  }

  const safeImage = sanitizeAdTarget(image);
  if (!safeImage) return null;

  const body = (
    <div className="relative h-25 overflow-hidden rounded-xl border border-border/30">
      <AdBadge />
      <Image
        src={safeImage}
        alt={title}
        fill
        sizes="(max-width: 384px) 100vw, 100px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-xs font-semibold leading-tight">{title}</p>
      </div>
    </div>
  );

  if (!safeLink) return body;
  return (
    <CardLink href={safeLink} className="block">
      {body}
    </CardLink>
  );
}
