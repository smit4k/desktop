import { useState } from "react";
import { CheckFill, Translate2Line } from "@mingcute/react";
import DropdownMenu from "@/shared/ui/DropdownMenu";
import { useTranslation } from "@/languages";
import { getLyricAnnotations } from "../engine/lyricsAnnotations";
import { useLyricsStore } from "../store/lyricsStore";

export function LyricsLanguageMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const lyrics = useLyricsStore((s) => s.braccatoLyrics);
  const showTranslation = useLyricsStore((s) => s.showTranslation);
  const showPronunciation = useLyricsStore((s) => s.showPronunciation);
  const setShowTranslation = useLyricsStore((s) => s.setShowTranslation);
  const setShowPronunciation = useLyricsStore((s) => s.setShowPronunciation);
  if (!lyrics.length) return null;

  const annotations = lyrics.map(getLyricAnnotations);
  const hasTranslation = annotations.some((line) => line.translation);
  const hasPronunciation = annotations.some((line) => line.pronunciation);
  const items = [
    {
      id: "translation",
      label: t("player.lyric_languages.translation"),
      available: hasTranslation,
      checked: showTranslation,
      onClick: () => setShowTranslation(!showTranslation),
    },
    {
      id: "pronunciation",
      label: t("player.lyric_languages.pronunciation"),
      available: hasPronunciation,
      checked: showPronunciation,
      onClick: () => setShowPronunciation(!showPronunciation),
    },
  ];

  return (
    <div
      data-keyboard-focus
      data-no-window-drag
      className="pointer-events-auto"
    >
      <DropdownMenu
        open={open}
        onOpenChange={setOpen}
        align="end"
        trigger={
          <button
            type="button"
            aria-label={t("player.lyric_languages.label")}
            title={t("player.lyric_languages.label")}
            aria-haspopup="menu"
            aria-expanded={open}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-none bg-black/50 text-white/80 backdrop-blur-xl transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
          >
            <Translate2Line size={18} />
          </button>
        }
        items={items.map(({ available, label, checked, ...item }) => ({
          ...item,
          checked,
          disabled: !available,
          label: available
            ? label
            : `${label} — ${t("player.lyric_languages.unavailable")}`,
          icon: <CheckFill size={14} className={checked ? "" : "invisible"} />,
        }))}
      />
    </div>
  );
}
