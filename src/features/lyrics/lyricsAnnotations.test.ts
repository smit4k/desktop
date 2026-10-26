import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LineData, Lyric } from "@braccato/core";
import {
  decorateLyricsLines,
  getLyricAnnotations,
} from "./engine/lyricsAnnotations";
import { applyLyricsOffset, parseRawLyrics } from "./engine/lyricsParser";
import { useLyricsStore } from "./store/lyricsStore";
import { debouncedStorage } from "@/shared/utils/storage";
import japanese from "./fixtures/japanese.ttml?raw";
import chinese from "./fixtures/chinese.ttml?raw";

function makeLines(lyrics: Lyric[]): LineData[] {
  return lyrics.map((lyric) => {
    const lyricElement = document.createElement("div");
    lyricElement.textContent = lyric.words;
    return {
      lyricElement,
      time: lyric.startTimeMs / 1000,
      duration: lyric.durationMs / 1000,
      parts: [],
      animations: [],
      isScrolled: false,
      isAnimationPlayStatePlaying: false,
      accumulatedOffsetMs: 0,
      isAnimating: false,
      lastAnimSetupAt: 0,
      isSelected: false,
      height: -1,
      position: -1,
      decorations: new Map(),
    };
  });
}

describe("lyric annotations", () => {
  it("preserves Japanese annotations and leaves uncovered lines original-only", () => {
    const { braccatoLyrics } = parseRawLyrics(japanese, "ttml");
    expect(getLyricAnnotations(braccatoLyrics[0])).toEqual({
      translation: "The world is waiting",
      pronunciation: "sekai ga matteru",
    });
    expect(getLyricAnnotations(braccatoLyrics[1])).toEqual({
      translation: null,
      pronunciation: null,
    });
  });

  it("prefers English, then regional English, then the single-translation fallback", () => {
    const line = parseRawLyrics(japanese).braccatoLyrics[0];
    line.translations = { fr: "français", "en-US": "regional", en: "exact" };
    expect(getLyricAnnotations(line).translation).toBe("exact");
    line.translations.en = " ";
    expect(getLyricAnnotations(line).translation).toBe("regional");
    line.translations = { fr: "français" };
    line.translation = { lang: "en-GB", text: "fallback" };
    expect(getLyricAnnotations(line).translation).toBe("fallback");
    line.translation.lang = "fr";
    expect(getLyricAnnotations(line).translation).toBeNull();
  });

  it.each(["[00:01.00] Hello world", "Hello world"])(
    "leaves lyrics without annotations unchanged: %s",
    (raw) => {
      const { braccatoLyrics } = parseRawLyrics(raw);
      const renderer = { lines: makeLines(braccatoLyrics) };
      decorateLyricsLines(renderer, braccatoLyrics, {
        showTranslation: true,
        showPronunciation: true,
      });
      expect(renderer.lines[0].lyricElement.children).toHaveLength(0);
      expect(renderer.lines[0].lyricElement.textContent).toBe("Hello world");
    },
  );

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "shows translation=%s and pronunciation=%s without duplicating decorations",
    (showTranslation, showPronunciation) => {
      const { braccatoLyrics } = parseRawLyrics(japanese);
      const renderer = { lines: makeLines(braccatoLyrics) };
      const preferences = { showTranslation, showPronunciation };
      decorateLyricsLines(renderer, braccatoLyrics, preferences);
      decorateLyricsLines(renderer, braccatoLyrics, preferences);
      const decorations = renderer.lines[0].lyricElement.children;
      expect(decorations).toHaveLength(2);
      expect(decorations[0].classList.contains("blyrics--romanized")).toBe(
        true,
      );
      expect(decorations[1].classList.contains("blyrics--translated")).toBe(
        true,
      );
      expect((decorations[0] as HTMLElement).hidden).toBe(!showPronunciation);
      expect((decorations[1] as HTMLElement).hidden).toBe(!showTranslation);
      expect(decorations[1].getAttribute("lang")).toBe("en");
      expect(renderer.lines[1].lyricElement.children).toHaveLength(0);
    },
  );

  it("keeps supplied Chinese pronunciation timing through offsets and repeated toggles", () => {
    const parsed = parseRawLyrics(chinese, "ttml");
    expect(parsed.braccatoLyrics[0].timedRomanization).toHaveLength(3);
    const adjusted = applyLyricsOffset(parsed, 500);
    const renderer = { lines: makeLines(adjusted.braccatoLyrics) };
    decorateLyricsLines(renderer, adjusted.braccatoLyrics, {
      showTranslation: true,
      showPronunciation: true,
    });
    const parts = renderer.lines[0].parts;
    expect(parts.map((part) => part.time)).toEqual([1.5, 2.5, 3.5]);
    expect(parts.map((part) => part.duration)).toEqual([1, 1, 2]);
    decorateLyricsLines(renderer, adjusted.braccatoLyrics, {
      showTranslation: false,
      showPronunciation: false,
    });
    decorateLyricsLines(renderer, adjusted.braccatoLyrics, {
      showTranslation: true,
      showPronunciation: true,
    });
    expect(renderer.lines[0].parts).toHaveLength(3);
    expect(parsed.braccatoLyrics[0].timedRomanization![0].startTimeMs).toBe(
      1000,
    );
  });

  it("omits blank annotations and annotations on instrumental lines", () => {
    const line = parseRawLyrics(japanese).braccatoLyrics[0];
    line.isInstrumental = true;
    expect(getLyricAnnotations(line)).toEqual({
      translation: null,
      pronunciation: null,
    });
    const renderer = { lines: makeLines([line]) };
    decorateLyricsLines(renderer, [line], {
      showTranslation: true,
      showPronunciation: true,
    });
    expect(renderer.lines[0].lyricElement.children).toHaveLength(0);
    expect(
      getLyricAnnotations({
        ...line,
        isInstrumental: false,
        translations: { en: " " },
        translation: undefined,
        romanization: " ",
      }),
    ).toEqual({ translation: null, pronunciation: null });
  });
});

describe("lyric language preferences", () => {
  beforeEach(() => {
    useLyricsStore.getState().reset();
    useLyricsStore.setState({
      showTranslation: false,
      showPronunciation: false,
    });
  });
  afterEach(() => {
    useLyricsStore.getState().reset();
    useLyricsStore.setState({
      showTranslation: false,
      showPronunciation: false,
    });
    debouncedStorage.removeItem("liner_lyrics_session_v1");
  });

  it("defaults both annotations off and preserves opt-ins across track changes and resets", () => {
    const store = useLyricsStore.getState();
    expect(useLyricsStore.getInitialState().showTranslation).toBe(false);
    expect(useLyricsStore.getInitialState().showPronunciation).toBe(false);
    expect(store.showTranslation).toBe(false);
    expect(store.showPronunciation).toBe(false);
    store.setShowTranslation(true);
    store.setShowPronunciation(true);
    store.setLyricsState({ currentLyricsTrackId: "next-track" });
    store.reset();
    expect(useLyricsStore.getState().showTranslation).toBe(true);
    expect(useLyricsStore.getState().showPronunciation).toBe(true);
  });

  it("rehydrates saved choices and accepts older sessions without the new preferences", async () => {
    useLyricsStore.getState().setShowTranslation(true);
    const saved = debouncedStorage.getItem("liner_lyrics_session_v1")!;
    useLyricsStore.setState({
      showTranslation: false,
      showPronunciation: true,
    });
    debouncedStorage.setItem("liner_lyrics_session_v1", saved);
    await useLyricsStore.persist.rehydrate();
    expect(useLyricsStore.getState().showTranslation).toBe(true);
    expect(useLyricsStore.getState().showPronunciation).toBe(false);
    useLyricsStore.setState({
      showTranslation: false,
      showPronunciation: false,
    });
    debouncedStorage.setItem(
      "liner_lyrics_session_v1",
      JSON.stringify({ state: { trackOffsets: { old: 200 } }, version: 0 }),
    );
    await useLyricsStore.persist.rehydrate();
    expect(useLyricsStore.getState().showTranslation).toBe(false);
    expect(useLyricsStore.getState().showPronunciation).toBe(false);
    expect(useLyricsStore.getState().trackOffsets.old).toBe(200);
  });
});
