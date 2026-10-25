import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImmersiveSleevePicker } from "./ImmersiveSleevePicker";
import { useCustomizationStore } from "@/features/settings/store/customizationStore";
import { useDisableButtonFocus } from "@/features/navigation/hooks/useDisableButtonFocus";
import { useGlobalShortcuts } from "@/features/navigation/hooks/useGlobalShortcuts";
import { debouncedStorage } from "@/shared/utils/storage";

vi.mock("@/features/player", () => ({
  playerEngine: { togglePlayPause: vi.fn() },
  usePlayerStore: { getState: () => ({}) },
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: React.forwardRef<HTMLDivElement, Record<string, unknown>>(
      (
        {
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          ...props
        },
        ref,
      ) => <div {...props} ref={ref} />,
    ),
  },
}));

import { playerEngine } from "@/features/player";

const closeFullscreen = vi.fn();

function Harness() {
  useDisableButtonFocus();
  useGlobalShortcuts({
    searchOpen: false,
    openSearch: vi.fn(),
    closeSearch: vi.fn(),
    rightPanelOpen: false,
    openRightPanel: vi.fn(),
    closeRightPanel: vi.fn(),
    fullscreenOpen: true,
    openFullscreen: vi.fn(),
    closeFullscreen,
  });
  return (
    <div data-theme="dark">
      <ImmersiveSleevePicker />
    </div>
  );
}

describe("ImmersiveSleevePicker", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    useCustomizationStore.getState().setImmersiveSleeve("none");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useCustomizationStore.getState().setImmersiveSleeve("none");
    debouncedStorage.removeItem("liner_customization_v1");
  });

  it("applies a sleeve immediately and updates the selected label", () => {
    const trigger = container.querySelector("button")!;
    expect(trigger.textContent).toContain("Original");
    act(() => trigger.click());
    expect(
      [...document.querySelectorAll("[data-dropdown-menu] button")].map(
        (button) => button.textContent,
      ),
    ).toEqual(["Original", "CD case", "Vinyl"]);
    const vinyl = [
      ...document.querySelectorAll<HTMLButtonElement>(
        "[data-dropdown-menu] button",
      ),
    ].find((button) => button.textContent === "Vinyl")!;
    expect(vinyl).toBeDefined();
    act(() => vinyl.click());
    expect(useCustomizationStore.getState().immersiveSleeve).toBe("vinyl");
    expect(trigger.textContent).toContain("Vinyl");
  });

  it("keeps the trigger and menu focusable and gives Escape to the menu first", () => {
    const trigger = container.querySelector("button")!;
    act(() => trigger.focus());
    expect(document.activeElement).toBe(trigger);
    const space = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      bubbles: true,
      cancelable: true,
    });
    act(() => trigger.dispatchEvent(space));
    expect(space.defaultPrevented).toBe(false);
    expect(playerEngine.togglePlayPause).not.toHaveBeenCalled();
    // jsdom doesn't synthesize the native button click from a Space keyup.
    act(() => trigger.click());
    const option = document.querySelector<HTMLButtonElement>(
      "[data-dropdown-menu] button",
    )!;
    act(() => option.focus());
    expect(document.activeElement).toBe(option);
    act(() =>
      option.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
        }),
      ),
    );
    expect(closeFullscreen).not.toHaveBeenCalled();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
        }),
      ),
    );
    expect(closeFullscreen).toHaveBeenCalledOnce();
  });

  it("supports arrow navigation and preserves immersive theme across the portal", () => {
    const trigger = container.querySelector("button")!;
    act(() => trigger.focus());
    act(() =>
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          code: "ArrowDown",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    const menu = document.querySelector('[role="menu"]')!;
    expect(menu.getAttribute("data-theme")).toBe("dark");
    expect(document.activeElement?.textContent).toBe("Original");
    act(() =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          code: "ArrowDown",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(document.activeElement?.textContent).toBe("CD case");
    act(() => (document.activeElement as HTMLButtonElement).click());
    expect(useCustomizationStore.getState().immersiveSleeve).toBe("cd");
    expect(document.activeElement).toBe(trigger);
  });
});
