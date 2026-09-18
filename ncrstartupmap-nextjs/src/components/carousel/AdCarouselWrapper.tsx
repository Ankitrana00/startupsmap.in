"use client";

import { cn } from "@/lib/utils";

import { AdCarousel } from "./AdCarousel";

interface AdCarouselWrapperProps {
  ads: { id: string; image?: string; title: string; link: string; isPromo?: boolean }[];
  className?: string;
}

export function AdCarouselWrapper({ ads, className }: AdCarouselWrapperProps) {
  // Don't render if no ads
  if (!ads || ads.length === 0) return null;

  return (
    <div className={cn("flex w-full justify-center", className)}>
      <div className="w-full">
        <AdCarousel ads={ads} />
      </div>
    </div>
  );
}
