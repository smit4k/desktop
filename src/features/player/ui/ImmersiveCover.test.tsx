import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IMMERSIVE_SLEEVES } from "@/features/settings/store/customizationStore";
import { ImmersiveCover } from "./ImmersiveCover";

vi.mock("@/features/covers", () => ({
  useCoverReady: () => true,
  CoverImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

describe("ImmersiveCover", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each(IMMERSIVE_SLEEVES)(
    "renders artwork and an empty-cover fallback in %s",
    (sleeve) => {
      act(() =>
        root.render(
          <ImmersiveCover
            sleeve={sleeve}
            coverUrl="/album.jpg"
            title="Album"
            size={340}
          />,
        ),
      );
      expect(container.querySelector("img")?.alt).toBe("Album");
      expect(
        container.querySelector("[data-sleeve]")?.getAttribute("data-sleeve"),
      ).toBe(sleeve);
      act(() =>
        root.render(
          <ImmersiveCover
            sleeve={sleeve}
            coverUrl=""
            title="No cover"
            size={340}
          />,
        ),
      );
      expect(
        container.querySelector('svg[aria-label="No cover"]'),
      ).not.toBeNull();
    },
  );

  it("keeps materials mounted while tracks change and removes them for Original", () => {
    act(() =>
      root.render(
        <ImmersiveCover
          sleeve="cd"
          coverUrl="/first.jpg"
          title="First"
          trackId="1"
          size={340}
        />,
      ),
    );
    const plastic = container.querySelector('[aria-hidden="true"]');
    expect(plastic).not.toBeNull();
    act(() =>
      root.render(
        <ImmersiveCover
          sleeve="cd"
          coverUrl="/second.jpg"
          title="Second"
          trackId="2"
          size={340}
        />,
      ),
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBe(plastic);
    expect(
      container.querySelector('img[alt="Second"]')?.getAttribute("src"),
    ).toBe("/second.jpg");
    act(() =>
      root.render(
        <ImmersiveCover
          sleeve="none"
          coverUrl="/second.jpg"
          title="Second"
          trackId="2"
          size={340}
        />,
      ),
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("pauses and resumes motion without remounting the cover", () => {
    act(() =>
      root.render(
        <ImmersiveCover
          sleeve="cd"
          coverUrl="/album.jpg"
          title="Album"
          size={340}
          isPlaying
        />,
      ),
    );
    const artwork = container.querySelector("img");
    expect(container.querySelector('[data-playing="true"]')).not.toBeNull();
    act(() =>
      root.render(
        <ImmersiveCover
          sleeve="cd"
          coverUrl="/album.jpg"
          title="Album"
          size={340}
          isPlaying={false}
        />,
      ),
    );
    expect(container.querySelector('[data-playing="false"]')).not.toBeNull();
    expect(container.querySelector("img")).toBe(artwork);
    act(() =>
      root.render(
        <ImmersiveCover
          sleeve="cd"
          coverUrl="/album.jpg"
          title="Album"
          size={340}
          isPlaying
        />,
      ),
    );
    expect(container.querySelector("img")).toBe(artwork);
  });
});
