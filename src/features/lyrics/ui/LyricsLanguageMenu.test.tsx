import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LyricsLanguageMenu } from "./LyricsLanguageMenu";
import { useLyricsStore } from "../store/lyricsStore";
import { parseRawLyrics } from "../engine/lyricsParser";
import { debouncedStorage } from "@/shared/utils/storage";
import japanese from "../fixtures/japanese.ttml?raw";

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

describe("LyricsLanguageMenu", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    localStorage.setItem("liner_locale", "en");
    useLyricsStore.getState().reset();
    useLyricsStore.setState({
      showTranslation: false,
      showPronunciation: false,
    });
    useLyricsStore.getState().setLyricsState(parseRawLyrics(japanese));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <div data-theme="dark">
          <LyricsLanguageMenu />
        </div>,
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useLyricsStore.getState().reset();
    useLyricsStore.setState({
      showTranslation: false,
      showPronunciation: false,
    });
    debouncedStorage.removeItem("liner_lyrics_session_v1");
    localStorage.removeItem("liner_locale");
    vi.unstubAllGlobals();
  });

  function openMenu() {
    const trigger = container.querySelector<HTMLButtonElement>("button")!;
    act(() => trigger.click());
    return [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemcheckbox"]',
      ),
    ];
  }

  it("offers independently checked controls and restores focus after toggling", () => {
    const trigger = container.querySelector<HTMLButtonElement>("button")!;
    const items = openMenu();
    expect(items.map((item) => item.textContent)).toEqual([
      "English translation",
      "Pronunciation",
    ]);
    expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual([
      "false",
      "false",
    ]);
    expect(
      document.querySelector('[role="menu"]')?.getAttribute("data-theme"),
    ).toBe("dark");
    act(() => items[0].click());
    expect(useLyricsStore.getState().showTranslation).toBe(true);
    expect(useLyricsStore.getState().showPronunciation).toBe(false);
    expect(document.activeElement).toBe(trigger);
    const reopened = openMenu();
    expect(reopened[0].getAttribute("aria-checked")).toBe("true");
    act(() => reopened[1].click());
    expect(useLyricsStore.getState().showPronunciation).toBe(true);
  });

  it("disables missing annotations for the selected source without changing saved preferences", () => {
    act(() => useLyricsStore.getState().setShowTranslation(true));
    act(() =>
      useLyricsStore
        .getState()
        .setLyricsState(parseRawLyrics("[00:01.00] Hello")),
    );
    const items = openMenu();
    expect(items.every((item) => item.disabled)).toBe(true);
    expect(items[0].textContent).toBe(
      "English translation — Unavailable for this source",
    );
    act(() => items[0].click());
    expect(useLyricsStore.getState().showTranslation).toBe(true);
    act(() =>
      useLyricsStore.getState().setLyricsState(parseRawLyrics(japanese)),
    );
    expect(
      document.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')!
        .disabled,
    ).toBe(false);
  });

  it("supports keyboard opening, arrow navigation, and Escape focus restoration", () => {
    const trigger = container.querySelector<HTMLButtonElement>("button")!;
    act(() => trigger.focus());
    act(() =>
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(document.activeElement?.textContent).toBe("English translation");
    act(() =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(document.activeElement?.textContent).toBe("Pronunciation");
    act(() =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides the control when lyrics are cleared", () => {
    act(() => useLyricsStore.getState().reset());
    expect(container.querySelector("button")).toBeNull();
  });
});
