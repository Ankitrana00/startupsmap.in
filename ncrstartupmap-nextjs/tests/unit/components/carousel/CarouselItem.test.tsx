import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarouselItem } from "@/components/carousel/CarouselItem";

describe("CarouselItem crash guard (Phase 1)", () => {
  it("renders text fallback — never <img> — when image is undefined", () => {
    const { container } = render(
      <CarouselItem title="No image ad" link="https://example.com" />,
    );
    expect(screen.getByText("No image ad")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders text fallback — never <img> — when image is empty string", () => {
    const { container } = render(
      <CarouselItem title="Empty image ad" link="https://example.com" image="" />,
    );
    expect(screen.getByText("Empty image ad")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders text fallback when isPromo even if an image is provided", () => {
    const { container } = render(
      <CarouselItem
        title="Promo card"
        link="/promote"
        image="/some-image.png"
        isPromo
      />,
    );
    expect(screen.getByText("Promo card")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders an image when a real image is provided and not promo", () => {
    const { container } = render(
      <CarouselItem
        title="Real ad"
        link="https://example.com"
        image="/real-ad.png"
      />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("Real ad");
  });
});
