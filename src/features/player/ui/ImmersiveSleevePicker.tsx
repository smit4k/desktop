import { useTranslation } from "@/languages";
import { MenuSelect } from "@/shared/ui";
import {
  IMMERSIVE_SLEEVES,
  useCustomizationStore,
} from "@/features/settings/store/customizationStore";

export function ImmersiveSleevePicker() {
  const { t } = useTranslation();
  const sleeve = useCustomizationStore((s) => s.immersiveSleeve);
  const setSleeve = useCustomizationStore((s) => s.setImmersiveSleeve);

  return (
    <div
      data-keyboard-focus
      data-no-window-drag
      className="absolute top-[6px] left-[44px] z-30 flex h-8 items-center gap-2"
    >
      <span className="text-[12px] text-white/60">
        {t("player.sleeve.label")}
      </span>
      <MenuSelect
        options={IMMERSIVE_SLEEVES.map((value) => ({
          value,
          label: t(`player.sleeve.${value}`),
        }))}
        value={sleeve}
        onChange={setSleeve}
        align="start"
        aria-label={t("player.sleeve.label")}
        className="bg-black/50 text-white/80 backdrop-blur-xl hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
      />
    </div>
  );
}
