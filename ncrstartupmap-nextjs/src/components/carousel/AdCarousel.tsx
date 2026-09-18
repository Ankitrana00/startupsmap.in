"use client";

import { CarouselItem } from "./CarouselItem";
import { cn } from "@/lib/utils";

interface AdCarouselProps {
  ads: { id: string; image?: string; title: string; link: string; isPromo?: boolean }[];
  className?: string;
}

export function AdCarousel({ ads, className }: AdCarouselProps) {
  if (!ads || ads.length === 0) return null;

  return (
    <div className={cn("w-full overflow-x-auto overflow-y-hidden", className)}>
      <div className="flex gap-2 p-2">
        {ads.map((ad) => (
          <div key={ad.id} className="w-25 flex-shrink-0">
            <CarouselItem image={ad.image} title={ad.title} link={ad.link} isPromo={ad.isPromo} />
          </div>
        ))}
      </div>
    </div>
  );
}
