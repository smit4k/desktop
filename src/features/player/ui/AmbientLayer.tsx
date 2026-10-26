import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cachedAmbientScript, loadAmbientScript } from "@/shared/media/ambient";
import { cn } from "@/shared/lib";
import { AMBIENT_FADE_MS } from "../hooks/ambientFeed";
import {
  useAmbientWorker,
  type AmbientOptions,
} from "../hooks/useAmbientWorker";
import { usePlayerStore } from "../store/playerStore";

interface AmbientLayerProps {
  trackId: string | undefined;
}

interface AmbientScene {
  key: string;
  script: string;
}

function sceneKey(script: string): string {
  let hash = 0;
  for (let i = 0; i < script.length; i++) {
    hash = (Math.imul(hash, 31) + script.charCodeAt(i)) | 0;
  }
  return `${script.length}:${hash}`;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface AmbientCanvasProps {
  script: string;
  visible: boolean;
}

function AmbientCanvas({ script, visible }: AmbientCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [options, setOptions] = useState<AmbientOptions>();
  const fail = useCallback(() => setFailed(true), []);
  useAmbientWorker(
    hostRef,
    options?.pixelated ?? false,
    failed ? null : script,
    fail,
    setOptions,
  );
  if (failed) return null;
  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        transitionDuration: `${AMBIENT_FADE_MS}ms`,
        filter: `blur(${options?.blur ?? 0}px)`,
      }}
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity ease-out [mask-image:linear-gradient(to_right,black_30%,rgba(0,0,0,0.12)_62%)]",
        visible && options ? "opacity-80" : "opacity-0",
      )}
    />
  );
}

function useAmbientScript(trackId: string | undefined): string | null {
  const [loaded, setLoaded] = useState<{
    trackId: string;
    script: string | null;
  }>();

  useEffect(() => {
    if (!trackId || prefersReducedMotion()) return;
    let active = true;
    void loadAmbientScript(trackId).then((script) => {
      if (active) setLoaded({ trackId, script });
    });
    return () => {
      active = false;
    };
  }, [trackId]);

  if (!trackId || prefersReducedMotion()) return null;
  const script =
    loaded?.trackId === trackId ? loaded.script : cachedAmbientScript(trackId);
  return script ?? null;
}

export default function AmbientLayer({ trackId }: AmbientLayerProps) {
  const script = useAmbientScript(trackId);
  const playing = usePlayerStore((s) => s.status === "playing");
  const wanted = useMemo<AmbientScene | null>(
    () => (script ? { key: sceneKey(script), script } : null),
    [script],
  );
  const [shown, setShown] = useState<AmbientScene | null>(wanted);

  useEffect(() => {
    if (wanted?.key === shown?.key) return;
    const timer = window.setTimeout(
      () => setShown(wanted),
      shown ? AMBIENT_FADE_MS : 0,
    );
    return () => window.clearTimeout(timer);
  }, [wanted, shown]);

  if (!shown) return null;
  return (
    <AmbientCanvas
      key={shown.key}
      script={shown.script}
      visible={playing && wanted?.key === shown.key}
    />
  );
}
