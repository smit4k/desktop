import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IMMERSIVE_SLEEVES, useCustomizationStore } from "./customizationStore";
import { debouncedStorage } from "@/shared/utils/storage";

const storageKey = "liner_customization_v1";

beforeEach(() => {
  useCustomizationStore.setState({ coverGlow: true, immersiveSleeve: "none" });
  debouncedStorage.removeItem(storageKey);
});

afterEach(() => {
  useCustomizationStore.setState({ coverGlow: true, immersiveSleeve: "none" });
  debouncedStorage.removeItem(storageKey);
});

describe("immersive sleeve preference", () => {
  it("defaults to the original cover", () => {
    expect(useCustomizationStore.getState().immersiveSleeve).toBe("none");
  });

  it.each(IMMERSIVE_SLEEVES)(
    "saves and restores %s alongside cover glow",
    async (sleeve) => {
      const store = useCustomizationStore.getState();
      store.setCoverGlow(false);
      store.setImmersiveSleeve(sleeve);
      debouncedStorage.flush();
      const saved = localStorage.getItem(storageKey)!;
      expect(JSON.parse(saved).state).toEqual({
        coverGlow: false,
        immersiveSleeve: sleeve,
      });

      useCustomizationStore.setState({
        coverGlow: true,
        immersiveSleeve: "none",
      });
      debouncedStorage.setItem(storageKey, saved);
      await useCustomizationStore.persist.rehydrate();
      expect(useCustomizationStore.getState().immersiveSleeve).toBe(sleeve);
      expect(useCustomizationStore.getState().coverGlow).toBe(false);
      expect(useCustomizationStore.getState().setImmersiveSleeve).toBeTypeOf(
        "function",
      );
    },
  );

  it.each([undefined, "unknown", "cassette", null, 42, {}])(
    "uses Original for missing or invalid saved value %j",
    async (immersiveSleeve) => {
      debouncedStorage.setItem(
        storageKey,
        JSON.stringify({
          state: { coverGlow: false, immersiveSleeve },
          version: 0,
        }),
      );
      await useCustomizationStore.persist.rehydrate();
      expect(useCustomizationStore.getState().immersiveSleeve).toBe("none");
      expect(useCustomizationStore.getState().coverGlow).toBe(false);
    },
  );
});
