import {
  injectRomanization,
  injectTranslation,
  type LyricsRenderer,
  type Lyric,
} from "@braccato/core";
import {
  ROMANIZED_LYRICS_CLASS,
  TRANSLATED_LYRICS_CLASS,
} from "@braccato/core/constants";

export function getLyricAnnotations(line: Lyric) {
  if (line.isInstrumental) return { translation: null, pronunciation: null };

  const translations = Object.entries(line.translations ?? {});
  const translation =
    translations
      .find(([lang, text]) => /^en$/i.test(lang) && text.trim())?.[1]
      .trim() ||
    translations
      .find(([lang, text]) => /^en-/i.test(lang) && text.trim())?.[1]
      .trim() ||
    (/^en(?:-|$)/i.test(line.translation?.lang ?? "")
      ? line.translation?.text.trim()
      : null) ||
    null;
  const pronunciation =
    line.romanization?.trim() ||
    line.timedRomanization
      ?.map((part) => part.words)
      .join("")
      .trim() ||
    null;

  return { translation, pronunciation };
}

export function decorateLyricsLines(
  renderer: Pick<LyricsRenderer, "lines">,
  lyrics: Lyric[],
  preferences: { showTranslation: boolean; showPronunciation: boolean },
) {
  renderer.lines.forEach((line, index) => {
    const lyric = lyrics[index];
    if (!lyric) return;
    const { translation, pronunciation } = getLyricAnnotations(lyric);
    const element = line.lyricElement;
    const doc = element.ownerDocument;

    if (pronunciation) {
      injectRomanization(
        doc,
        element,
        line,
        pronunciation,
        lyric.timedRomanization,
      );
    }
    if (translation) injectTranslation(doc, element, translation);

    const romanized = element.querySelector<HTMLElement>(
      `.${ROMANIZED_LYRICS_CLASS}`,
    );
    const translated = element.querySelector<HTMLElement>(
      `.${TRANSLATED_LYRICS_CLASS}`,
    );
    if (romanized) romanized.hidden = !preferences.showPronunciation;
    if (translated) {
      translated.lang = "en";
      translated.hidden = !preferences.showTranslation;
    }
  });
}
